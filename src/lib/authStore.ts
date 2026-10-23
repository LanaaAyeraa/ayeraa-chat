import crypto from "crypto";
import { User, StoredUser, SessionTokenPayload, AuthResponse } from "@/types/auth";

const AUTH_SECRET = process.env.AYERAA_AUTH_SECRET || "ayeraa_chat_secret_key_2026_zinc_ultra_secure_token";
const TOKEN_EXPIRY_DAYS = 30;

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
      };
      users.set(payload.id, restoredUser);
      usernames.set(payload.username.toLowerCase(), payload.id);
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

// Register user
export function registerUser(
  usernameInput: string,
  passwordInput: string,
  nameInput?: string,
  avatarInput?: string,
  bioInput?: string
): AuthResponse {
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

// Login user
export function loginUser(
  usernameInput: string,
  passwordInput: string,
  credentialToken?: string
): AuthResponse {
  const users = getUsersMap();
  const usernames = getUsernamesMap();

  const cleanUsername = usernameInput.trim().toLowerCase();
  let userId = usernames.get(cleanUsername);

  // Self-heal from client-grounded credential token if container restarted
  if ((!userId || !users.has(userId)) && credentialToken) {
    const recovered = verifyCredentialToken(credentialToken);
    if (recovered && recovered.username.toLowerCase() === cleanUsername) {
      userId = recovered.id;
      users.set(userId, recovered);
      usernames.set(cleanUsername, userId);
    }
  }

  if (!userId || !users.has(userId)) {
    return { success: false, error: "Username atau password salah." };
  }

  const stored = users.get(userId)!;
  if (!stored.passwordHash || !stored.salt) {
    return { success: false, error: "Akun ini menggunakan metode login Google." };
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
export function getUserById(userId: string): User | null {
  const users = getUsersMap();
  const stored = users.get(userId);
  return stored ? toPublicUser(stored) : null;
}

// Update profile
export function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    avatar?: string;
    bio?: string;
    newPassword?: string;
    oldPassword?: string;
  }
): AuthResponse {
  const users = getUsersMap();
  const stored = users.get(userId);

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
    bio: "Pengguna Ayeraa Chat via Google",
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
