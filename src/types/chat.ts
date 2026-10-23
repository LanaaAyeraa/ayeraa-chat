export interface Participant {
  id: string;
  name: string;
  avatar: string;
  joinedAt: number;
  lastActiveAt: number;
  isTyping: boolean;
  isOnline?: boolean;
}

export interface ReplyContext {
  id: string;
  senderName: string;
  content: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: number;
  updatedAt?: number;
  replyTo?: ReplyContext;
  reactions: Record<string, string[]>; // emoji -> string[] of userIds
  isSystem?: boolean;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  hostId: string;
  participants: Record<string, Participant>;
  messages: Message[];
}

export interface PollResponse {
  roomId: string;
  roomName: string;
  messages: Message[];
  participants: Participant[];
  typingUsers: string[];
  serverTime: number;
}
