import { Room, Participant, Message, Attachment } from "@/types/chat";
import fs from "fs";
import { isDmRoom, getDmPeerId } from "./utils";
import { addDmNotification, recordUserDmRoom } from "./notificationStore";

declare global {
  // eslint-disable-next-line no-var
  var __ayeraaChatRooms: Map<string, Room> | undefined;
}

const rooms: Map<string, Room> = globalThis.__ayeraaChatRooms ?? new Map<string, Room>();
globalThis.__ayeraaChatRooms = rooms;

const BLOB_READ_WRITE_TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ||
  "vercel_blob_rw_ITF3zssU2LGjc6OV_hxJF6c5r5LcxswYaItHqMtoG818Fdg";
const BLOB_BASE_URL = "https://itf3zssu2lgjc6ov.public.blob.vercel-storage.com";

const PARTICIPANT_ACTIVE_TIMEOUT_MS = 15000; // 15s for accurate presence dot
const PARTICIPANT_EVICTION_TIMEOUT_MS = 3600000; // 1 hour retainment
const MAX_MESSAGES_PER_ROOM = 500;
const MAX_ROOMS = 100;

function getSafeRoomFileName(roomId: string): string {
  return roomId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

function getTmpRoomPath(roomId: string): string {
  const safe = getSafeRoomFileName(roomId);
  return `/tmp/ayeraa_room_${safe}.json`;
}

// Merge messages without duplicates, keeping latest reactions/edits
function mergeRoomMessages(room: Room, incomingMessages: Message[]): void {
  const map = new Map<string, Message>();
  for (const m of room.messages) {
    map.set(m.id, m);
  }
  for (const inc of incomingMessages) {
    const existing = map.get(inc.id);
    if (!existing) {
      map.set(inc.id, inc);
    } else {
      const incUpdate = Math.max(inc.updatedAt || 0, inc.timestamp || 0);
      const existUpdate = Math.max(existing.updatedAt || 0, existing.timestamp || 0);
      if (incUpdate >= existUpdate) {
        map.set(inc.id, {
          ...existing,
          ...inc,
          reactions: { ...existing.reactions, ...inc.reactions },
        });
      }
    }
  }
  room.messages = Array.from(map.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-MAX_MESSAGES_PER_ROOM);
}

// Sync room from storage (Local /tmp -> Vercel Blob ground truth)
export async function syncRoomFromStorage(roomId: string): Promise<Room> {
  const normalizedId = roomId.trim().toLowerCase();
  const room = getOrCreateRoom(normalizedId);
  const tmpPath = getTmpRoomPath(normalizedId);

  // 1. Try local /tmp
  try {
    if (fs.existsSync(tmpPath)) {
      const content = fs.readFileSync(tmpPath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        mergeRoomMessages(room, parsed.messages);
        if (parsed.name && (room.name.startsWith("Room dm--") || room.name.startsWith("Room "))) {
          room.name = parsed.name;
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. Try Vercel Blob
  try {
    const blobKey = `rooms/${getSafeRoomFileName(normalizedId)}.json`;
    const res = await fetch(`${BLOB_BASE_URL}/${blobKey}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const parsed = await res.json();
      if (parsed && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        mergeRoomMessages(room, parsed.messages);
        if (parsed.name && (room.name.startsWith("Room dm--") || room.name.startsWith("Room "))) {
          room.name = parsed.name;
        }
        // Write to /tmp cache for faster subsequent reads in this container
        try {
          fs.writeFileSync(tmpPath, JSON.stringify(parsed), "utf-8");
        } catch {}
      }
    }
  } catch {
    // ignore fetch error
  }

  return room;
}

// Persist room to storage (Local /tmp + Vercel Blob)
export async function persistRoomToStorage(roomId: string): Promise<void> {
  const normalizedId = roomId.trim().toLowerCase();
  const room = rooms.get(normalizedId);
  if (!room) return;

  const dataToSave = {
    id: room.id,
    name: room.name,
    createdAt: room.createdAt,
    hostId: room.hostId,
    messages: room.messages,
  };
  const jsonStr = JSON.stringify(dataToSave);

  // 1. Write to /tmp
  try {
    fs.writeFileSync(getTmpRoomPath(normalizedId), jsonStr, "utf-8");
  } catch {
    // ignore
  }

  // 2. Write to Vercel Blob
  try {
    const { put } = await import("@vercel/blob");
    const blobKey = `rooms/${getSafeRoomFileName(normalizedId)}.json`;
    await put(blobKey, jsonStr, {
      access: "public",
      addRandomSuffix: false,
      token: BLOB_READ_WRITE_TOKEN,
    });
  } catch {
    // ignore
  }
}

export function getOrCreateRoom(roomId: string, roomName?: string, hostId = "system"): Room {
  const normalizedId = roomId.trim().toLowerCase();
  const isDm = normalizedId.startsWith("dm--") || normalizedId.startsWith("dm_");
  let room = rooms.get(normalizedId);
  if (!room) {
    // Evict oldest room if capacity reached
    if (rooms.size >= MAX_ROOMS) {
      const oldestKey = rooms.keys().next().value;
      if (oldestKey) rooms.delete(oldestKey);
    }

    const defaultTitle = isDm ? "Direct Message" : `Room ${normalizedId}`;
    const welcomeMsg = isDm
      ? "Obrolan pribadi terenkripsi. Riwayat obrolan tersimpan secara aman."
      : `Welcome to **${roomName?.trim() || normalizedId}**! Share this link with friends to chat instantly.`;

    room = {
      id: normalizedId,
      name: roomName?.trim() || defaultTitle,
      createdAt: Date.now(),
      hostId,
      participants: {},
      messages: [
        {
          id: `sys-${Date.now()}-welcome`,
          roomId: normalizedId,
          senderId: "system",
          senderName: "Ayeraa Keeper",
          senderAvatar: isDm ? "🔒" : "🕯️",
          content: welcomeMsg,
          timestamp: Date.now(),
          updatedAt: Date.now(),
          reactions: {},
          isSystem: true,
        },
      ],
    };
    rooms.set(normalizedId, room);
  } else if (roomName && roomName !== room.name && (room.name === `Room ${normalizedId}` || room.name === "Direct Message")) {
    room.name = roomName;
  }
  return room;
}

export function getRoom(roomId: string): Room | null {
  const normalizedId = roomId.trim().toLowerCase();
  return rooms.get(normalizedId) ?? null;
}

export function listPublicRooms(): { id: string; name: string; participantsCount: number; messageCount: number }[] {
  const now = Date.now();
  const result: { id: string; name: string; participantsCount: number; messageCount: number }[] = [];

  for (const [id, room] of rooms.entries()) {
    if (id.startsWith("dm--") || id.startsWith("dm_")) continue;
    const activeCount = Object.values(room.participants).filter(
      (p) => now - p.lastActiveAt < PARTICIPANT_ACTIVE_TIMEOUT_MS
    ).length;
    result.push({
      id,
      name: room.name,
      participantsCount: activeCount,
      messageCount: room.messages.length,
    });
  }
  return result;
}

export function registerParticipant(
  roomId: string,
  participant: { id: string; name: string; avatar: string }
): Room {
  const room = getOrCreateRoom(roomId);
  const now = Date.now();
  const existing = room.participants[participant.id];

  room.participants[participant.id] = {
    id: participant.id,
    name: participant.name,
    avatar: participant.avatar,
    joinedAt: existing ? existing.joinedAt : now,
    lastActiveAt: now,
    isTyping: false,
  };

  if (!existing) {
    room.messages.push({
      id: `sys-${now}-${participant.id}`,
      roomId: room.id,
      senderId: "system",
      senderName: "Ayeraa Keeper",
      senderAvatar: "🍃",
      content: `${participant.name} joined the room`,
      timestamp: now,
      updatedAt: now,
      reactions: {},
      isSystem: true,
    });
  }

  if (isDmRoom(room.id)) {
    recordUserDmRoom(participant.id, room.id).catch(() => {});
  }

  return room;
}

export function leaveRoom(roomId: string, userId: string): void {
  const room = rooms.get(roomId.trim().toLowerCase());
  if (!room) return;
  if (room.participants[userId]) {
    // Mark as inactive beyond active timeout (17s ago) so user stays in list but is immediately offline/away
    room.participants[userId].lastActiveAt = Date.now() - PARTICIPANT_ACTIVE_TIMEOUT_MS - 2000;
    room.participants[userId].isTyping = false;
  }
}

export async function addMessage(
  roomId: string,
  params: {
    senderId: string;
    senderName: string;
    senderAvatar: string;
    content?: string;
    attachment?: Attachment;
    replyTo?: { id: string; senderName: string; content: string };
  }
): Promise<Message> {
  const room = getOrCreateRoom(roomId);
  const now = Date.now();
  const message: Message = {
    id: `msg-${now}-${Math.random().toString(36).substring(2, 8)}`,
    roomId: room.id,
    senderId: params.senderId,
    senderName: params.senderName,
    senderAvatar: params.senderAvatar,
    content: (params.content || "").trim().slice(0, 4000), // Enforce 4000 char limit for text caption
    attachment: params.attachment,
    timestamp: now,
    updatedAt: now,
    replyTo: params.replyTo,
    reactions: {},
    isSystem: false,
  };

  room.messages.push(message);
  if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
    room.messages.shift();
  }

  if (room.participants[params.senderId]) {
    room.participants[params.senderId].lastActiveAt = now;
    room.participants[params.senderId].isTyping = false;
  }

  await persistRoomToStorage(room.id);

  if (isDmRoom(room.id)) {
    const peerId = getDmPeerId(room.id, params.senderId);
    if (peerId && peerId !== params.senderId) {
      recordUserDmRoom(params.senderId, room.id).catch(() => {});
      recordUserDmRoom(peerId, room.id).catch(() => {});

      const previewText =
        (params.content || "").trim() ||
        (params.attachment
          ? params.attachment.isImage
            ? "Mengirim foto"
            : `Mengirim berkas: ${params.attachment.name}`
          : "Pesan baru");

      addDmNotification({
        recipientId: peerId,
        dmRoomId: room.id,
        senderId: params.senderId,
        senderName: params.senderName,
        senderAvatar: params.senderAvatar,
        content: previewText,
      }).catch(() => {});
    }
  }

  return message;
}

export async function toggleReaction(
  roomId: string,
  messageId: string,
  userId: string,
  emoji: string,
  clientReactions?: Record<string, string[]>
): Promise<Message | null> {
  const room = getOrCreateRoom(roomId);

  let msg = room.messages.find((m) => m.id === messageId);
  if (!msg) {
    msg = {
      id: messageId,
      roomId: room.id,
      senderId: "participant",
      senderName: "Chat Member",
      senderAvatar: "💬",
      content: "",
      timestamp: Date.now(),
      updatedAt: Date.now(),
      reactions: clientReactions ? { ...clientReactions } : {},
    };
    room.messages.push(msg);
  } else if (clientReactions && Object.keys(msg.reactions).length === 0 && Object.keys(clientReactions).length > 0) {
    msg.reactions = { ...clientReactions };
  }

  if (!msg.reactions[emoji]) {
    msg.reactions[emoji] = [];
  }

  const userIndex = msg.reactions[emoji].indexOf(userId);
  if (userIndex > -1) {
    msg.reactions[emoji].splice(userIndex, 1);
    if (msg.reactions[emoji].length === 0) {
      delete msg.reactions[emoji];
    }
  } else {
    msg.reactions[emoji].push(userId);
  }

  // Touch updatedAt so delta sync recognizes reaction updates!
  msg.updatedAt = Date.now();

  await persistRoomToStorage(room.id);

  return msg;
}

export function setTypingStatus(roomId: string, userId: string, isTyping: boolean): void {
  const room = getOrCreateRoom(roomId);

  const p = room.participants[userId];
  if (p) {
    p.isTyping = isTyping;
    p.lastActiveAt = Date.now();
  }
}

export function getDelta(
  roomId: string,
  sinceTimestamp = 0,
  currentUserId?: string,
  userName?: string,
  userAvatar?: string
): {
  roomName: string;
  messages: Message[];
  participants: Participant[];
  typingUsers: string[];
  serverTime: number;
} | null {
  const room = getOrCreateRoom(roomId);
  const now = Date.now();

  // Self-healing presence / heartbeat registration
  if (currentUserId) {
    const existing = room.participants[currentUserId];
    if (existing) {
      existing.lastActiveAt = now;
      if (userName && userName !== existing.name) existing.name = userName;
      if (userAvatar && userAvatar !== existing.avatar) existing.avatar = userAvatar;
    } else if (userName) {
      room.participants[currentUserId] = {
        id: currentUserId,
        name: userName,
        avatar: userAvatar || "⚡",
        joinedAt: now,
        lastActiveAt: now,
        isTyping: false,
      };
    }
  }

  const allParticipants: Participant[] = [];
  const typingUsers: string[] = [];

  for (const [id, p] of Object.entries(room.participants)) {
    const elapsed = now - p.lastActiveAt;
    const isOnline = elapsed < PARTICIPANT_ACTIVE_TIMEOUT_MS;

    if (elapsed > PARTICIPANT_EVICTION_TIMEOUT_MS && id !== room.hostId) {
      // Memory cleanup: Evict dead participants only after 1 hour of zero activity
      delete room.participants[id];
      continue;
    }

    allParticipants.push({
      ...p,
      isOnline,
    });

    if (p.isTyping && isOnline && p.id !== currentUserId) {
      typingUsers.push(p.name);
    }
  }

  // Sort: current user first, then online users, then by lastActiveAt descending
  allParticipants.sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return b.lastActiveAt - a.lastActiveAt;
  });

  // Include messages created or reacted to since timestamp
  const newMessages = sinceTimestamp > 0
    ? room.messages.filter((m) => Math.max(m.timestamp, m.updatedAt || 0) > sinceTimestamp)
    : room.messages;

  return {
    roomName: room.name,
    messages: newMessages,
    participants: allParticipants,
    typingUsers,
    serverTime: now,
  };
}

export function _resetStoreForTesting(): void {
  rooms.clear();
}
