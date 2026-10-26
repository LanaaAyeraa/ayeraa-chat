import crypto from "crypto";
import fs from "fs";
import { User, StoredUser, SessionTokenPayload, AuthResponse } from "@/types/auth";

const AUTH_SECRET = process.env.AYERAA_AUTH_SECRET || "ayeraa_chat_secret_key_2026_zinc_ultra_secure_token";
const TOKEN_EXPIRY_DAYS = 30;

const USERS_BLOB_PATH = "ayeraa_accounts_v1.json";
const USERS_BLOB_URL = "https://itf3zssu2lgjc6ov.public.blob.vercel-storage.com/ayeraa_accounts_v1.json";
const BLOB_READ_WRITE_TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ||
  "vercel_blob_rw_ITF3zssU2LGjc6OV_hxJF6c5r5LcxswYaItHqMtoG818Fdg";
const TMP_USERS_FILE = "/tmp/ayeraa_accounts_v1.json";

// Global container storage
declare global {
  // eslint-disable-next-line no-var
  var __ayeraaChatUsers: Map<string, StoredUser> | undefined;
  // eslint-disable-next-line no-var
  var __ayeraaChatUsernames: Map<string, string> | undefined; // lowercase username -> userId
}

function getUsersMap(): Map<string, StoredUser> {
  if (!globalThis.__ayeraaChatUsers) {
    globalThis.__ayeraaChatUsers = new Map<string, StoredUser>();
  }
  return globalThis.__ayeraaChatUsers;
}

function getUsernamesMap(): Map<string, string> {
  if (!globalThis.__ayeraaChatUsernames) {
    globalThis.__ayeraaChatUsernames = new Map<string, string>();
  }
  return globalThis.__ayeraaChatUsernames;
}

// Password hashing with salt
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Base64URL encode/decode
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

// Merge helper: LWW but NEVER drop passwordHash/salt credentials
function mergeUser(existing: StoredUser | undefined, incoming: StoredUser): StoredUser {
  if (!existing) return incoming;

  const existingTs = existing.updatedAt || existing.createdAt || 0;
  const incomingTs = incoming.updatedAt || incoming.createdAt || 0;

  // Pick the newer record as base
  const winner = incomingTs >= existingTs ? { ...incoming } : { ...existing };
  const loser = incomingTs >= existingTs ? existing : incoming;

  // Preserve credentials: if winner lost them, carry forward from loser
  if (!winner.passwordHash && loser.passwordHash) {
    winner.passwordHash = loser.passwordHash;
    winner.salt = loser.salt;
  }

  return winner;
}

// Sync users from persistent storage into in-memory container maps (LWW merge)
export async function syncUsersFromStorage(): Promise<void> {
  const users = getUsersMap();
  const usernames = getUsernamesMap();

  // 1. Try local /tmp file
  try {
    if (fs.existsSync(TMP_USERS_FILE)) {
      const content = fs.readFileSync(TMP_USERS_FILE, "utf-8");
      const list: StoredUser[] = JSON.parse(content);
      for (const u of list) {
        const merged = mergeUser(users.get(u.id), u);
        users.set(merged.id, merged);
        usernames.set(merged.username.toLowerCase(), merged.id);
      }
    }
  } catch {
    // ignore local read error
  }

  // 2. Try Vercel Blob CDN URL with strict anti-cache headers
  try {
    const res = await fetch(`${USERS_BLOB_URL}?t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    if (res.ok) {
      const list: StoredUser[] = await res.json();
      for (const u of list) {
        const merged = mergeUser(users.get(u.id), u);
        users.set(merged.id, merged);
        usernames.set(merged.username.toLowerCase(), merged.id);
      }
    }
  } catch {
    // ignore fetch error
  }
}

// Persist all users to storage (/tmp file + Vercel Blob) with conflict-free merge
export async function persistUsersToStorage(): Promise<void> {
  const users = getUsersMap();
  const usernames = getUsernamesMap();

  // Conflict-Free Merge: Fetch latest remote blob first to capture concurrent writes from other containers
  try {
    const res = await fetch(`${USERS_BLOB_URL}?t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    if (res.ok) {
      const remoteList: StoredUser[] = await res.json();
      for (const r of remoteList) {
        const merged = mergeUser(users.get(r.id), r);
        users.set(merged.id, merged);
        usernames.set(merged.username.toLowerCase(), merged.id);
      }
    }
  } catch {
    // ignore remote fetch error
  }

  const allUsers = Array.from(users.values());
  const jsonStr = JSON.stringify(allUsers);

  // 1. Local /tmp write
  try {
    fs.writeFileSync(TMP_USERS_FILE, jsonStr, "utf-8");
  } catch {
    // ignore
  }

  // 2. Vercel Blob write (cross-container cloud persistence)
  try {
    const { put } = await import("@vercel/blob");
    await put(USERS_BLOB_PATH, jsonStr, {
      access: "public",
      addRandomSuffix: false,
      token: BLOB_READ_WRITE_TOKEN,
    });
  } catch {
    // Silently continue if blob put is not available in local environment
  }
}


// Stateless signed credential token (Self-healing across serverless containers)
export function createCredentialToken(storedUser: StoredUser): string {
  const payload = {
    id: storedUser.id,
    username: storedUser.username,
    name: storedUser.name,
    avatar: storedUser.avatar,
    bio: storedUser.bio,
    provider: storedUser.provider,
    passwordHash: storedUser.passwordHash,
    salt: storedUser.salt,
    createdAt: storedUser.createdAt,
    iat: Math.floor(Date.now() / 1000),
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const hmac = crypto.createHmac("sha256", AUTH_SECRET);
  hmac.update(encoded);
  const sig = base64UrlEncode(hmac.digest("base64"));
  return `${encoded}.${sig}`;
}

export function verifyCredentialToken(credToken: string): StoredUser | null {
  try {
    if (!credToken || typeof credToken !== "string") return null;
    const parts = credToken.split(".");
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const hmac = crypto.createHmac("sha256", AUTH_SECRET);
    hmac.update(encoded);
    const expected = base64UrlEncode(hmac.digest("base64"));
    if (sig !== expected) return null;
    return JSON.parse(base64UrlDecode(encoded));
  } catch {
    return null;
  }
}

// Token creation (HMAC-SHA256)
export function createSessionToken(user: User): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + TOKEN_EXPIRY_DAYS * 24 * 60 * 60;

  const payload: SessionTokenPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
    avatar: user.avatar,
    provider: user.provider,
    iat,
    exp,
  };

  const payloadStr = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadStr);

  const hmac = crypto.createHmac("sha256", AUTH_SECRET);
  hmac.update(encodedPayload);
  const signature = base64UrlEncode(hmac.digest("base64"));

  return `${encodedPayload}.${signature}`;
}

// Token verification
export function verifySessionToken(token: string): SessionTokenPayload | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encodedPayload, signature] = parts;
    const hmac = crypto.createHmac("sha256", AUTH_SECRET);
    hmac.update(encodedPayload);
    const expectedSignature = base64UrlEncode(hmac.digest("base64"));

    if (signature !== expectedSignature) {
      return null;
    }

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload: SessionTokenPayload = JSON.parse(payloadJson);

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    // Self-healing: if container does not have user in memory, restore from verified token
    const users = getUsersMap();
    const usernames = getUsernamesMap();
    if (!users.has(payload.id)) {
      const restoredUser: StoredUser = {
        id: payload.id,
        username: payload.username,
        name: payload.name,
        avatar: payload.avatar,
        provider: payload.provider || "local",
        createdAt: payload.iat * 1000,
        updatedAt: Date.now(),
        // Mark as restored-from-session so merge logic knows this has no credentials
      };
      users.set(payload.id, restoredUser);
      usernames.set(payload.username.toLowerCase(), payload.id);

      // Async: pull full record from storage to recover passwordHash/salt
      syncUsersFromStorage().catch(() => {});
    }

    return payload;
  } catch {
    return null;
  }
}

// Convert StoredUser to public User
function toPublicUser(stored: StoredUser): User {
  return {
    id: stored.id,
    username: stored.username,
    name: stored.name,
    avatar: stored.avatar,
    bio: stored.bio,
    provider: stored.provider,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  };
}

// Register user (with cross-container cloud persistence)
export async function registerUser(
  usernameInput: string,
  passwordInput: string,
  nameInput?: string,
  avatarInput?: string,
  bioInput?: string
): Promise<AuthResponse> {
  // Sync first to verify username uniqueness against other containers
  await syncUsersFromStorage();

  const users = getUsersMap();
  const usernames = getUsernamesMap();

  const cleanUsername = usernameInput.trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 24) {
    return { success: false, error: "Username harus 3 - 24 karakter." };
  }

  if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
    return {
      success: false,
      error: "Username hanya boleh huruf, angka, titik, strip (-), dan garis bawah (_).",
    };
  }

  if (!passwordInput || passwordInput.length < 6) {
    return { success: false, error: "Password minimal 6 karakter." };
  }

  if (usernames.has(cleanUsername)) {
    return { success: false, error: "Username sudah digunakan, silakan pilih yang lain." };
  }

  const userId = `usr_${cleanUsername}_${Date.now().toString(36)}`;
  const salt = generateSalt();
  const passwordHash = hashPassword(passwordInput, salt);

  const newUser: StoredUser = {
    id: userId,
    username: cleanUsername,
    name: nameInput?.trim() || cleanUsername,
    avatar: avatarInput?.trim() || "⚡",
    bio: bioInput?.trim() || "",
    provider: "local",
    passwordHash,
    salt,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  users.set(userId, newUser);
  usernames.set(cleanUsername, userId);

  // Persist to storage across all containers
  await persistUsersToStorage();

  const publicUser = toPublicUser(newUser);
  const token = createSessionToken(publicUser);
  const credentialToken = createCredentialToken(newUser);

  return {
    success: true,
    token,
    credentialToken,
    user: publicUser,
  };
}

// Login user (with cross-container sync)
export async function loginUser(
  usernameInput: string,
  passwordInput: string,
  credentialToken?: string
): Promise<AuthResponse> {
  const users = getUsersMap();
  const usernames = getUsernamesMap();

  const cleanUsername = usernameInput.trim().toLowerCase();
  let userId = usernames.get(cleanUsername);

  // 1. If not found in memory, try credentialToken
  if ((!userId || !users.has(userId)) && credentialToken) {
    const recovered = verifyCredentialToken(credentialToken);
    if (recovered && recovered.username.toLowerCase() === cleanUsername) {
      userId = recovered.id;
      users.set(userId, recovered);
      usernames.set(cleanUsername, userId);
    }
  }

  // 2. If still not in memory, sync from persistent storage (Vercel Blob / /tmp)
  if (!userId || !users.has(userId)) {
    await syncUsersFromStorage();
    userId = usernames.get(cleanUsername);
  }

  if (!userId || !users.has(userId)) {
    return { success: false, error: "Username atau password salah." };
  }

  const stored = users.get(userId)!;
  if (!stored.passwordHash || !stored.salt) {
    if (stored.provider === "google") {
      return { success: false, error: "Akun ini menggunakan login Google. Silakan masuk via Google." };
    }
    // Local account with missing credentials (data corruption recovery)
    return { success: false, error: "Data password akun ini rusak. Silakan hubungi admin untuk reset password." };
  }

  const computedHash = hashPassword(passwordInput, stored.salt);
  if (computedHash !== stored.passwordHash) {
    return { success: false, error: "Username atau password salah." };
  }

  const publicUser = toPublicUser(stored);
  const token = createSessionToken(publicUser);
  const freshCredentialToken = createCredentialToken(stored);

  return {
    success: true,
    token,
    credentialToken: freshCredentialToken,
    user: publicUser,
  };
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  const users = getUsersMap();
  let stored = users.get(userId);
  if (!stored) {
    await syncUsersFromStorage();
    stored = users.get(userId);
  }
  return stored ? toPublicUser(stored) : null;
}

// Search users by username or display name (excluding current user if requested)
export async function searchUsers(query: string, excludeUserId?: string): Promise<User[]> {
  await syncUsersFromStorage();
  const users = getUsersMap();
  const q = (query || "").trim().toLowerCase();
  const results: User[] = [];

  for (const stored of users.values()) {
    if (excludeUserId && stored.id === excludeUserId) continue;
    if (!q) {
      results.push(toPublicUser(stored));
      continue;
    }
    const matchUsername = stored.username.toLowerCase().includes(q);
    const matchName = stored.name.toLowerCase().includes(q);
    if (matchUsername || matchName) {
      results.push(toPublicUser(stored));
    }
  }

  // Sort: most recently updated / created first
  return results
    .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
    .slice(0, 30);
}

// Update profile
export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    avatar?: string;
    bio?: string;
    newPassword?: string;
    oldPassword?: string;
  }
): Promise<AuthResponse> {
  const users = getUsersMap();
  let stored = users.get(userId);

  if (!stored) {
    await syncUsersFromStorage();
    stored = users.get(userId);
  }

  if (!stored) {
    return { success: false, error: "Pengguna tidak ditemukan." };
  }

  // Password change validation
  if (updates.newPassword) {
    if (stored.provider === "google") {
      return { success: false, error: "Akun Google tidak menggunakan password." };
    }
    if (!updates.oldPassword) {
      return { success: false, error: "Password lama wajib diisi untuk mengganti password." };
    }
    const oldHash = hashPassword(updates.oldPassword, stored.salt || "");
    if (oldHash !== stored.passwordHash) {
      return { success: false, error: "Password lama tidak cocok." };
    }
    if (updates.newPassword.length < 6) {
      return { success: false, error: "Password baru minimal 6 karakter." };
    }
    const newSalt = generateSalt();
    stored.salt = newSalt;
    stored.passwordHash = hashPassword(updates.newPassword, newSalt);
  }

  if (updates.name !== undefined) {
    stored.name = updates.name.trim() || stored.username;
  }

  if (updates.avatar !== undefined) {
    stored.avatar = updates.avatar.trim() || "⚡";
  }

  if (updates.bio !== undefined) {
    stored.bio = updates.bio.trim();
  }

  stored.updatedAt = Date.now();
  users.set(userId, stored);

  // Persist update across containers
  await persistUsersToStorage();

  const publicUser = toPublicUser(stored);
  const token = createSessionToken(publicUser);
  const credentialToken = createCredentialToken(stored);

  return {
    success: true,
    token,
    credentialToken,
    user: publicUser,
  };
}

// Reset password for a local account (recovery for corrupted/missing credentials)
export async function resetPassword(
  usernameInput: string,
  newPassword: string
): Promise<AuthResponse> {
  await syncUsersFromStorage();

  const users = getUsersMap();
  const usernames = getUsernamesMap();

  const cleanUsername = usernameInput.trim().toLowerCase();
  const userId = usernames.get(cleanUsername);

  if (!userId || !users.has(userId)) {
    return { success: false, error: "Username tidak ditemukan." };
  }

  const stored = users.get(userId)!;

  if (stored.provider === "google") {
    return { success: false, error: "Akun Google tidak menggunakan password." };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password baru minimal 6 karakter." };
  }

  const newSalt = generateSalt();
  stored.salt = newSalt;
  stored.passwordHash = hashPassword(newPassword, newSalt);
  stored.updatedAt = Date.now();
  users.set(userId, stored);

  await persistUsersToStorage();

  const publicUser = toPublicUser(stored);
  const token = createSessionToken(publicUser);
  const credentialToken = createCredentialToken(stored);

  return {
    success: true,
    token,
    credentialToken,
    user: publicUser,
  };
}

// Handle Google OAuth / One Tap
export function handleGoogleAuth(profile: {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}): AuthResponse {
  const users = getUsersMap();
  const usernames = getUsernamesMap();

  const googleId = `g_${profile.sub || profile.email.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const baseUsername = profile.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
  let username = baseUsername;

  // Check if user already exists
  if (users.has(googleId)) {
    const existing = users.get(googleId)!;
    existing.name = profile.name || existing.name;
    if (profile.picture) existing.avatar = profile.picture;
    existing.updatedAt = Date.now();
    users.set(googleId, existing);

    const publicUser = toPublicUser(existing);
    return {
      success: true,
      token: createSessionToken(publicUser),
      credentialToken: createCredentialToken(existing),
      user: publicUser,
    };
  }

  // Create new google user
  let counter = 1;
  while (usernames.has(username)) {
    username = `${baseUsername}${counter++}`;
  }

  const newUser: StoredUser = {
    id: googleId,
    username,
    name: profile.name || username,
    avatar: profile.picture || "✨",
    bio: "Pengguna Ayeraa Chat",
    provider: "google",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  users.set(googleId, newUser);
  usernames.set(username, googleId);

  const publicUser = toPublicUser(newUser);
  return {
    success: true,
    token: createSessionToken(publicUser),
    credentialToken: createCredentialToken(newUser),
    user: publicUser,
  };
}

// Handle Guest Authentication (No password required)
export async function loginGuest(nameInput?: string, avatarInput?: string): Promise<AuthResponse> {
  const users = getUsersMap();
  const usernames = getUsernamesMap();

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  let guestUsername = `tamu_${randomSuffix}`;
  let counter = 1;
  while (usernames.has(guestUsername)) {
    guestUsername = `tamu_${randomSuffix}_${counter++}`;
  }

  const guestId = `guest_${randomSuffix}_${Date.now().toString(36)}`;
  const guestName = nameInput?.trim() || `Tamu #${randomSuffix}`;
  const guestAvatar = avatarInput?.trim() || "👤";

  const guestUser: StoredUser = {
    id: guestId,
    username: guestUsername,
    name: guestName,
    avatar: guestAvatar,
    bio: "Pengguna Tamu (Guest Mode)",
    provider: "guest",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  users.set(guestId, guestUser);
  usernames.set(guestUsername, guestId);

  // Persist guest record asynchronously so other containers find the user
  persistUsersToStorage().catch(() => {});

  const publicUser = toPublicUser(guestUser);
  const token = createSessionToken(publicUser);

  return {
    success: true,
    token,
    user: publicUser,
  };
}
