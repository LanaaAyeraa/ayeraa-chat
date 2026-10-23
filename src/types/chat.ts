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

export interface Attachment {
  url: string;        // Data URL (base64) or remote URL
  name: string;       // Original filename
  size: number;       // File size in bytes
  type: string;       // MIME type (e.g. image/jpeg, application/pdf)
  isImage: boolean;   // Quick discriminator for image vs file
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  attachment?: Attachment;
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
