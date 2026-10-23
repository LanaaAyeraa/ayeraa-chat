import { Room, Participant, Message } from "@/types/chat";

declare global {
  // eslint-disable-next-line no-var
  var __havenChatRooms: Map<string, Room> | undefined;
}

const rooms: Map<string, Room> = globalThis.__havenChatRooms ?? new Map<string, Room>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__havenChatRooms = rooms;
}

const PARTICIPANT_ACTIVE_TIMEOUT_MS = 45000; // 45s for presence dot
const PARTICIPANT_EVICTION_TIMEOUT_MS = 300000; // 5 min for garbage collection
const MAX_MESSAGES_PER_ROOM = 500;
const MAX_ROOMS = 100;

export function getOrCreateRoom(roomId: string, roomName?: string, hostId = "system"): Room {
  const normalizedId = roomId.trim().toLowerCase();
  let room = rooms.get(normalizedId);
  if (!room) {
    // Evict oldest room if capacity reached
    if (rooms.size >= MAX_ROOMS) {
      const oldestKey = rooms.keys().next().value;
      if (oldestKey) rooms.delete(oldestKey);
    }

    room = {
      id: normalizedId,
      name: roomName?.trim() || `Room ${normalizedId}`,
      createdAt: Date.now(),
      hostId,
      participants: {},
      messages: [
        {
          id: `sys-${Date.now()}-welcome`,
          roomId: normalizedId,
          senderId: "system",
          senderName: "Haven Keeper",
          senderAvatar: "🕯️",
          content: `Welcome to **${roomName?.trim() || normalizedId}**! Share this link with friends to chat instantly.`,
          timestamp: Date.now(),
          updatedAt: Date.now(),
          reactions: {},
          isSystem: true,
        },
      ],
    };
    rooms.set(normalizedId, room);
  } else if (roomName && roomName !== room.name && room.name === `Room ${normalizedId}`) {
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
      senderName: "Haven Keeper",
      senderAvatar: "🍃",
      content: `${participant.name} joined the room`,
      timestamp: now,
      updatedAt: now,
      reactions: {},
      isSystem: true,
    });
  }

  return room;
}

export function addMessage(
  roomId: string,
  params: {
    senderId: string;
    senderName: string;
    senderAvatar: string;
    content: string;
    replyTo?: { id: string; senderName: string; content: string };
  }
): Message {
  const room = getOrCreateRoom(roomId);
  const now = Date.now();
  const message: Message = {
    id: `msg-${now}-${Math.random().toString(36).substring(2, 8)}`,
    roomId: room.id,
    senderId: params.senderId,
    senderName: params.senderName,
    senderAvatar: params.senderAvatar,
    content: params.content.trim().slice(0, 4000), // Enforce 4000 char limit
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

  return message;
}

export function toggleReaction(
  roomId: string,
  messageId: string,
  userId: string,
  emoji: string
): Message | null {
  const room = getRoom(roomId);
  if (!room) return null;

  const msg = room.messages.find((m) => m.id === messageId);
  if (!msg) return null;

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

  return msg;
}

export function setTypingStatus(roomId: string, userId: string, isTyping: boolean): void {
  const room = getRoom(roomId);
  if (!room) return;

  const p = room.participants[userId];
  if (p) {
    p.isTyping = isTyping;
    p.lastActiveAt = Date.now();
  }
}

export function getDelta(
  roomId: string,
  sinceTimestamp = 0,
  currentUserId?: string
): {
  roomName: string;
  messages: Message[];
  participants: Participant[];
  typingUsers: string[];
  serverTime: number;
} | null {
  const room = getRoom(roomId);
  if (!room) return null;

  const now = Date.now();

  if (currentUserId && room.participants[currentUserId]) {
    room.participants[currentUserId].lastActiveAt = now;
  }

  const activeParticipants: Participant[] = [];
  const typingUsers: string[] = [];

  for (const [id, p] of Object.entries(room.participants)) {
    const elapsed = now - p.lastActiveAt;
    if (elapsed < PARTICIPANT_ACTIVE_TIMEOUT_MS) {
      activeParticipants.push(p);
      if (p.isTyping && p.id !== currentUserId) {
        typingUsers.push(p.name);
      }
    } else if (elapsed > PARTICIPANT_EVICTION_TIMEOUT_MS && id !== room.hostId) {
      // Memory cleanup: Evict dead participants after 5 minutes
      delete room.participants[id];
    }
  }

  // Include messages created or reacted to since timestamp
  const newMessages = sinceTimestamp > 0
    ? room.messages.filter((m) => Math.max(m.timestamp, m.updatedAt || 0) > sinceTimestamp)
    : room.messages;

  return {
    roomName: room.name,
    messages: newMessages,
    participants: activeParticipants,
    typingUsers,
    serverTime: now,
  };
}

export function _resetStoreForTesting(): void {
  rooms.clear();
}
