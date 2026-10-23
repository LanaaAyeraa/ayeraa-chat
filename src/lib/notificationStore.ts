import fs from "fs";
import { getDmPeerId } from "./utils";
import { syncRoomFromStorage, getOrCreateRoom } from "./roomStore";
import { getUserById } from "./authStore";

export interface DmNotification {
  id: string;
  recipientId: string;
  dmRoomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: number;
  read: boolean;
}

export interface DmConversation {
  roomId: string;
  peerId: string;
  peerName: string;
  peerUsername?: string;
  peerAvatar: string;
  peerIsOnline: boolean;
  lastMessageSnippet: string;
  lastMessageSenderId?: string;
  lastMessageTimestamp: number;
  unreadCount: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __ayeraaDmNotifications: Map<string, DmNotification[]> | undefined;
  // eslint-disable-next-line no-var
  var __ayeraaUserDms: Map<string, string[]> | undefined;
}

const notifications: Map<string, DmNotification[]> =
  globalThis.__ayeraaDmNotifications ?? new Map<string, DmNotification[]>();
globalThis.__ayeraaDmNotifications = notifications;

const userDmIndex: Map<string, string[]> =
  globalThis.__ayeraaUserDms ?? new Map<string, string[]>();
globalThis.__ayeraaUserDms = userDmIndex;

const BLOB_READ_WRITE_TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ||
  "vercel_blob_rw_ITF3zssU2LGjc6OV_hxJF6c5r5LcxswYaItHqMtoG818Fdg";
const BLOB_BASE_URL = "https://itf3zssu2lgjc6ov.public.blob.vercel-storage.com";

function getSafeUserKey(userId: string): string {
  return userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

function getTmpNotifPath(userId: string): string {
  const safe = getSafeUserKey(userId);
  return `/tmp/ayeraa_notifs_${safe}.json`;
}

function getTmpUserDmsPath(userId: string): string {
  const safe = getSafeUserKey(userId);
  return `/tmp/ayeraa_dms_${safe}.json`;
}

// ---------------------------------------------------------------------------
// Notifications Sync & Storage
// ---------------------------------------------------------------------------

function mergeNotifications(target: DmNotification[], incoming: DmNotification[]) {
  const map = new Map<string, DmNotification>();
  for (const n of target) map.set(n.id, n);
  for (const inc of incoming) {
    const exist = map.get(inc.id);
    if (!exist || inc.timestamp > exist.timestamp) {
      map.set(inc.id, inc);
    }
  }
  const merged = Array.from(map.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  target.length = 0;
  target.push(...merged);
}

export async function syncNotificationsFromStorage(userId: string): Promise<DmNotification[]> {
  const safe = getSafeUserKey(userId);
  const tmpPath = getTmpNotifPath(userId);
  let list = notifications.get(safe);
  if (!list) {
    list = [];
    notifications.set(safe, list);
  }

  // 1. Local /tmp
  try {
    if (fs.existsSync(tmpPath)) {
      const data = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
      if (Array.isArray(data)) {
        mergeNotifications(list, data);
      }
    }
  } catch {}

  // 2. Vercel Blob
  try {
    const res = await fetch(`${BLOB_BASE_URL}/notifications/${safe}.json?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        mergeNotifications(list, data);
        try {
          fs.writeFileSync(tmpPath, JSON.stringify(list), "utf-8");
        } catch {}
      }
    }
  } catch {}

  return list;
}

export async function persistNotificationsToStorage(userId: string): Promise<void> {
  const safe = getSafeUserKey(userId);
  const list = notifications.get(safe) || [];
  const jsonStr = JSON.stringify(list);

  try {
    fs.writeFileSync(getTmpNotifPath(userId), jsonStr, "utf-8");
  } catch {}

  try {
    const { put } = await import("@vercel/blob");
    await put(`notifications/${safe}.json`, jsonStr, {
      access: "public",
      addRandomSuffix: false,
      token: BLOB_READ_WRITE_TOKEN,
    });
  } catch {}
}

export async function addDmNotification(params: {
  recipientId: string;
  dmRoomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
}): Promise<DmNotification> {
  const safe = getSafeUserKey(params.recipientId);
  await syncNotificationsFromStorage(params.recipientId);

  let list = notifications.get(safe);
  if (!list) {
    list = [];
    notifications.set(safe, list);
  }

  const notif: DmNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    recipientId: params.recipientId,
    dmRoomId: params.dmRoomId,
    senderId: params.senderId,
    senderName: params.senderName,
    senderAvatar: params.senderAvatar,
    content: params.content.slice(0, 200),
    timestamp: Date.now(),
    read: false,
  };

  list.unshift(notif);
  if (list.length > 50) list.pop();

  await persistNotificationsToStorage(params.recipientId);
  return notif;
}

export async function getUnreadDmNotifications(userId: string): Promise<DmNotification[]> {
  const safe = getSafeUserKey(userId);
  await syncNotificationsFromStorage(userId);
  const list = notifications.get(safe) || [];
  return list.filter((n) => !n.read).sort((a, b) => b.timestamp - a.timestamp);
}

export async function markDmNotificationsAsRead(userId: string, dmRoomId: string): Promise<void> {
  const safe = getSafeUserKey(userId);
  await syncNotificationsFromStorage(userId);
  const list = notifications.get(safe) || [];
  let changed = false;

  for (const n of list) {
    if (n.dmRoomId.toLowerCase() === dmRoomId.toLowerCase() && !n.read) {
      n.read = true;
      changed = true;
    }
  }

  if (changed) {
    await persistNotificationsToStorage(userId);
  }
}

// ---------------------------------------------------------------------------
// User DM Conversation Index (WhatsApp / IG Style Threads)
// ---------------------------------------------------------------------------

export async function syncUserDmIndex(userId: string): Promise<string[]> {
  const safe = getSafeUserKey(userId);
  const tmpPath = getTmpUserDmsPath(userId);
  let list = userDmIndex.get(safe);
  if (!list) {
    list = [];
    userDmIndex.set(safe, list);
  }

  try {
    if (fs.existsSync(tmpPath)) {
      const data = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
      if (Array.isArray(data)) {
        for (const id of data) {
          if (!list.includes(id)) list.push(id);
        }
      }
    }
  } catch {}

  try {
    const res = await fetch(`${BLOB_BASE_URL}/user_dms/${safe}.json?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const id of data) {
          if (!list.includes(id)) list.push(id);
        }
        try {
          fs.writeFileSync(tmpPath, JSON.stringify(list), "utf-8");
        } catch {}
      }
    }
  } catch {}

  return list;
}

export async function persistUserDmIndex(userId: string): Promise<void> {
  const safe = getSafeUserKey(userId);
  const list = userDmIndex.get(safe) || [];
  const jsonStr = JSON.stringify(list);

  try {
    fs.writeFileSync(getTmpUserDmsPath(userId), jsonStr, "utf-8");
  } catch {}

  try {
    const { put } = await import("@vercel/blob");
    await put(`user_dms/${safe}.json`, jsonStr, {
      access: "public",
      addRandomSuffix: false,
      token: BLOB_READ_WRITE_TOKEN,
    });
  } catch {}
}

export async function recordUserDmRoom(userId: string, dmRoomId: string): Promise<void> {
  const safe = getSafeUserKey(userId);
  await syncUserDmIndex(userId);
  let list = userDmIndex.get(safe);
  if (!list) {
    list = [];
    userDmIndex.set(safe, list);
  }
  const cleanId = dmRoomId.trim().toLowerCase();
  const idx = list.indexOf(cleanId);
  if (idx > -1) {
    list.splice(idx, 1);
  }
  list.unshift(cleanId);
  if (list.length > 50) list.pop();

  await persistUserDmIndex(userId);
}

// Fetch WhatsApp/Instagram-style conversation cards for a user
export async function getUserDmConversations(userId: string): Promise<DmConversation[]> {
  const dmRoomIds = await syncUserDmIndex(userId);
  const unreadNotifs = await getUnreadDmNotifications(userId);

  // Also include any DM rooms from unread notifications if not in index yet
  for (const n of unreadNotifs) {
    if (!dmRoomIds.includes(n.dmRoomId)) {
      dmRoomIds.unshift(n.dmRoomId);
    }
  }

  const results: DmConversation[] = [];

  for (const dmRoomId of dmRoomIds) {
    const peerId = getDmPeerId(dmRoomId, userId);
    if (!peerId) continue;

    const room = await syncRoomFromStorage(dmRoomId);
    const peerUser = await getUserById(peerId);
    const peerParticipant = room.participants[peerId];

    const peerName =
      peerUser?.name || peerParticipant?.name || `User ${peerId.slice(-4)}`;
    const peerUsername = peerUser?.username;
    const peerAvatar = peerUser?.avatar || peerParticipant?.avatar || "⚡";
    const peerIsOnline = peerParticipant
      ? Date.now() - peerParticipant.lastActiveAt < 16000
      : false;

    // Last message preview
    const userMessages = room.messages.filter((m) => !m.isSystem);
    const lastMsg =
      userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;

    let snippet = "Mulai percakapan...";
    let lastSenderId: string | undefined;
    let lastTs = room.createdAt;

    if (lastMsg) {
      lastSenderId = lastMsg.senderId;
      lastTs = lastMsg.timestamp;
      const isMe = lastMsg.senderId === userId;
      if (lastMsg.content) {
        snippet = (isMe ? "Anda: " : "") + lastMsg.content;
      } else if (lastMsg.attachment) {
        snippet =
          (isMe ? "Anda mengirim " : "") +
          (lastMsg.attachment.isImage ? "📷 Foto" : "📎 Berkas");
      }
    }

    // Unread count for this specific room
    const unreadCount = unreadNotifs.filter(
      (n) => n.dmRoomId.toLowerCase() === dmRoomId.toLowerCase()
    ).length;

    results.push({
      roomId: dmRoomId,
      peerId,
      peerName,
      peerUsername,
      peerAvatar,
      peerIsOnline,
      lastMessageSnippet: snippet,
      lastMessageSenderId: lastSenderId,
      lastMessageTimestamp: lastTs,
      unreadCount,
    });
  }

  // Sort by most recently active conversation first
  return results.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
}
