import { Room, Participant, Message, Attachment } from "@/types/chat";

declare global {
  // eslint-disable-next-line no-var
  var __ayeraaChatRooms: Map<string, Room> | undefined;
}

const rooms: Map<string, Room> = globalThis.__ayeraaChatRooms ?? new Map<string, Room>();
globalThis.__ayeraaChatRooms = rooms;

const PARTICIPANT_ACTIVE_TIMEOUT_MS = 15000; // 15s for accurate presence dot
const PARTICIPANT_EVICTION_TIMEOUT_MS = 3600000; // 1 hour retainment
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
          senderName: "Ayeraa Keeper",
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
      senderName: "Ayeraa Keeper",
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

export function leaveRoom(roomId: string, userId: string): void {
  const room = rooms.get(roomId.trim().toLowerCase());
  if (!room) return;
  if (room.participants[userId]) {
    // Mark as inactive beyond active timeout (17s ago) so user stays in list but is immediately offline/away
    room.participants[userId].lastActiveAt = Date.now() - PARTICIPANT_ACTIVE_TIMEOUT_MS - 2000;
    room.participants[userId].isTyping = false;
  }
}

export function addMessage(
  roomId: string,
  params: {
    senderId: string;
    senderName: string;
    senderAvatar: string;
    content?: string;
    attachment?: Attachment;
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

  return message;
}

export function toggleReaction(
  roomId: string,
  messageId: string,
  userId: string,
  emoji: string,
  clientReactions?: Record<string, string[]>
): Message | null {
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
