"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Send,
  Volume2,
  VolumeX,
  Users,
  Smile,
  CornerDownRight,
  X,
  Compass,
  Sparkles,
  Circle,
} from "lucide-react";
import { Message, Participant, ReplyContext } from "@/types/chat";
import { formatTimestamp, AVATAR_OPTIONS } from "@/lib/utils";
import { sound } from "@/lib/sound";

const POPULAR_REACTIONS = ["❤️", "👍", "🔥", "😂", "👏", "🚀"];

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default function RoomChatPage({ params }: RoomPageProps) {
  const router = useRouter();
  const { roomId } = use(params);

  // User State
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("☕");
  const [hasJoined, setHasJoined] = useState(false);

  // Room State
  const [roomName, setRoomName] = useState<string>(`Room ${roomId}`);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Chat Input State
  const [inputText, setInputText] = useState("");
  const [replyTarget, setReplyTarget] = useState<ReplyContext | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Initialize identity
  useEffect(() => {
    let uid = localStorage.getItem("havenchat_user_id");
    if (!uid) {
      uid = `u-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem("havenchat_user_id", uid);
    }
    setUserId(uid);

    const savedName = localStorage.getItem("havenchat_user_name") || "Gentle Traveler";
    const savedAvatar = localStorage.getItem("havenchat_user_avatar") || "☕";
    setUserName(savedName);
    setUserAvatar(savedAvatar);
    setSoundEnabled(sound.isEnabled());

    // Register user in the room
    fetch(`/api/rooms/${roomId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: uid,
        name: savedName,
        avatar: savedAvatar,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRoomName(data.room.name);
          setParticipants(data.room.participants);
          setHasJoined(true);
        }
      })
      .catch(() => setHasJoined(true));
  }, [roomId]);

  // Delta Polling Loop with Visibility Optimization & State Merging
  useEffect(() => {
    if (!hasJoined || !userId) return;

    const fetchDelta = async () => {
      try {
        const since = lastTimestampRef.current;
        const res = await fetch(
          `/api/rooms/${roomId}/poll?since=${since}&userId=${encodeURIComponent(userId)}`
        );
        if (!res.ok) return;

        const data = await res.json();
        if (data.success) {
          if (data.roomName) setRoomName(data.roomName);
          if (data.participants) setParticipants(data.participants);
          if (data.typingUsers) setTypingUsers(data.typingUsers);

          if (data.messages && data.messages.length > 0) {
            setMessages((prev) => {
              const map = new Map(prev.map((m) => [m.id, m]));
              let hasNewIncoming = false;

              for (const inc of data.messages as Message[]) {
                if (!map.has(inc.id) && inc.senderId !== userId && !inc.isSystem) {
                  hasNewIncoming = true;
                }
                map.set(inc.id, inc); // update in place or append
              }

              if (hasNewIncoming) {
                sound.playReceive();
              }

              return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
            });

            // Update timestamp checkpoint based on latest creation or reaction touch
            const maxTs = Math.max(
              ...data.messages.map((m: Message) => Math.max(m.timestamp, m.updatedAt || 0)),
              lastTimestampRef.current
            );
            lastTimestampRef.current = maxTs;
            setTimeout(scrollToBottom, 60);
          }
        }
      } catch {
        // graceful silent backoff on network drop
      }
    };

    fetchDelta();

    // Adaptive interval: 1.5s when focused, 5s when tab backgrounded
    let intervalTime = 1500;
    const startPolling = () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(fetchDelta, intervalTime);
    };

    const handleVisibilityChange = () => {
      intervalTime = document.visibilityState === "hidden" ? 5000 : 1500;
      startPolling();
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasJoined, roomId, userId]);

  // Handle typing signal
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      fetch(`/api/rooms/${roomId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isTyping: true }),
      }).catch(() => {});
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      fetch(`/api/rooms/${roomId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isTyping: false }),
      }).catch(() => {});
    }, 2000);
  };

  // Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content || !userId) return;

    sound.playSend();
    setInputText("");
    const reply = replyTarget;
    setReplyTarget(null);

    // reset typing state immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);

    try {
      const res = await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: userId,
          senderName: userName,
          senderAvatar: userAvatar,
          content,
          replyTo: reply ? {
            id: reply.id,
            senderName: reply.senderName,
            content: reply.content.slice(0, 100),
          } : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        if (data.message.timestamp > lastTimestampRef.current) {
          lastTimestampRef.current = data.message.timestamp;
        }
        setTimeout(scrollToBottom, 60);
      }
    } catch {
      // optimistic message could be handled if offline
    }
  };

  // Toggle Reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    sound.playReaction();
    setShowEmojiPicker(null);

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const currentUsers = msg.reactions[emoji] || [];
        const hasReacted = currentUsers.includes(userId);
        const nextUsers = hasReacted
          ? currentUsers.filter((id) => id !== userId)
          : [...currentUsers, userId];

        const nextReactions = { ...msg.reactions };
        if (nextUsers.length > 0) {
          nextReactions[emoji] = nextUsers;
        } else {
          delete nextReactions[emoji];
        }
        return { ...msg, reactions: nextReactions };
      })
    );

    try {
      await fetch(`/api/rooms/${roomId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          userId,
          emoji,
        }),
      });
    } catch {
      // fallback
    }
  };

  // Copy Invite Link
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle Sound
  const toggleSound = () => {
    const nextVal = !soundEnabled;
    sound.setEnabled(nextVal);
    setSoundEnabled(nextVal);
  };

  return (
    <div className="flex h-screen bg-[#FAF9F5] text-[#1F1E1D] overflow-hidden selection:bg-[#CC5A37]/20">
      {/* Left Sidebar (Desktop) */}
      <aside className="w-80 border-r border-[#E5E3DC] bg-white flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          {/* Room Header Info */}
          <div className="p-5 border-b border-[#EFECE6]">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#6F6D66] hover:text-[#CC5A37] transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sanctuary</span>
            </Link>
            <h2 className="font-serif text-xl font-bold text-[#1F1E1D] tracking-tight truncate">
              {roomName}
            </h2>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-xs bg-[#FAF9F5] border border-[#E5E3DC] px-2.5 py-1 rounded-md text-[#6F6D66] truncate max-w-[180px]">
                {roomId}
              </span>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 text-xs text-[#CC5A37] hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Invite"}</span>
              </button>
            </div>
          </div>

          {/* Participants Presence List */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#6F6D66]">
                <Users className="w-3.5 h-3.5 text-[#CC5A37]" />
                <span>Present in Room</span>
              </div>
              <span className="text-xs bg-[#F7ECE6] text-[#CC5A37] font-semibold px-2 py-0.5 rounded-full">
                {participants.length}
              </span>
            </div>

            <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {participants.map((p) => {
                const isMe = p.id === userId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                      isMe ? "bg-[#FAF9F5] border border-[#E5E3DC]" : "hover:bg-[#FAF9F5]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="relative">
                        <span className="text-lg">{p.avatar}</span>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-[#1F1E1D] truncate flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {isMe && (
                            <span className="text-[10px] font-mono text-[#CC5A37] bg-[#F7ECE6] px-1.5 py-0.2 rounded">
                              you
                            </span>
                          )}
                        </p>
                        {p.isTyping && (
                          <p className="text-[11px] text-[#CC5A37] italic animate-pulse">
                            typing...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-[#EFECE6] bg-[#FAF9F5]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{userAvatar}</span>
            <div className="text-xs truncate max-w-[120px]">
              <p className="font-medium text-[#1F1E1D] truncate">{userName}</p>
              <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Connected
              </p>
            </div>
          </div>
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Mute chimes" : "Enable chimes"}
            className="p-2 rounded-lg text-[#6F6D66] hover:bg-white hover:text-[#1F1E1D] border border-transparent hover:border-[#E5E3DC] transition-all"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#CC5A37]" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] relative">
        {/* Mobile Header */}
        <header className="h-14 border-b border-[#E5E3DC] bg-white flex items-center justify-between px-4 md:hidden shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[#6F6D66] hover:text-[#1F1E1D]">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-serif font-bold text-sm text-[#1F1E1D] truncate max-w-[160px]">
                {roomName}
              </h1>
              <p className="text-[10px] text-[#6F6D66] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {participants.length} present
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="p-2 text-xs bg-[#FAF9F5] border border-[#E5E3DC] rounded-lg text-[#CC5A37]"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleSound}
              className="p-2 text-xs bg-[#FAF9F5] border border-[#E5E3DC] rounded-lg text-[#6F6D66]"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#CC5A37]" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Messages Stream Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Room Welcome Banner */}
          <div className="text-center py-6 border-b border-[#EFECE6] max-w-lg mx-auto">
            <div className="w-10 h-10 rounded-2xl bg-[#F7ECE6] text-[#CC5A37] flex items-center justify-center mx-auto mb-2 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-[#1F1E1D]">{roomName}</h3>
            <p className="text-xs text-[#6F6D66] mt-1">
              All messages are shared in real-time. Invite others with code:{" "}
              <span className="font-mono font-bold text-[#CC5A37]">{roomId}</span>
            </p>
          </div>

          {/* Messages Loop */}
          {messages.map((msg) => {
            const isMe = msg.senderId === userId;

            if (msg.isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFECE6]/60 border border-[#E5E3DC] text-xs text-[#6F6D66]">
                    <span>{msg.senderAvatar}</span>
                    <span>{msg.content}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`group flex items-start gap-3 ${
                  isMe ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E3DC] flex items-center justify-center text-lg shrink-0 shadow-sm mt-0.5">
                  {msg.senderAvatar}
                </div>

                {/* Message Bubble Container */}
                <div className={`max-w-[82%] sm:max-w-md ${isMe ? "items-end text-right" : "items-start text-left"}`}>
                  {/* Sender & Timestamp */}
                  <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                    <span className="text-xs font-semibold text-[#1F1E1D]">{msg.senderName}</span>
                    <span className="text-[10px] text-[#9B988F] font-mono">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>

                  {/* Quoted Reply Target Preview */}
                  {msg.replyTo && (
                    <div
                      className={`text-xs p-2 rounded-lg mb-1 border-l-2 bg-[#FAF9F5] border-[#CC5A37] text-[#6F6D66] ${
                        isMe ? "text-right" : "text-left"
                      }`}
                    >
                      <p className="font-medium text-[11px] text-[#CC5A37]">
                        Replying to {msg.replyTo.senderName}
                      </p>
                      <p className="truncate italic text-[11px] mt-0.5">{msg.replyTo.content}</p>
                    </div>
                  )}

                  {/* Bubble Content */}
                  <div
                    className={`relative p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${
                      isMe
                        ? "bg-[#CC5A37] text-white rounded-tr-none"
                        : "bg-white text-[#1F1E1D] border border-[#E5E3DC] rounded-tl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                    {/* Hover Action Bar */}
                    <div
                      className={`absolute -top-3.5 ${
                        isMe ? "left-2" : "right-2"
                      } hidden group-hover:flex items-center gap-1 bg-white border border-[#E5E3DC] px-1.5 py-0.5 rounded-full shadow-warm z-10`}
                    >
                      {POPULAR_REACTIONS.slice(0, 3).map((em) => (
                        <button
                          key={em}
                          onClick={() => handleToggleReaction(msg.id, em)}
                          className="hover:scale-125 text-xs transition-transform px-0.5"
                        >
                          {em}
                        </button>
                      ))}
                      <button
                        onClick={() =>
                          setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)
                        }
                        className="text-[#6F6D66] hover:text-[#1F1E1D] text-xs px-1"
                        title="More emojis"
                      >
                        <Smile className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() =>
                          setReplyTarget({
                            id: msg.id,
                            senderName: msg.senderName,
                            content: msg.content,
                          })
                        }
                        className="text-[#6F6D66] hover:text-[#CC5A37] text-xs px-1"
                        title="Reply"
                      >
                        <CornerDownRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Popover Emoji Picker */}
                    {showEmojiPicker === msg.id && (
                      <div
                        className={`absolute top-full mt-2 ${
                          isMe ? "left-0" : "right-0"
                        } bg-white border border-[#E5E3DC] p-2 rounded-xl shadow-warmLg flex gap-1.5 z-20`}
                      >
                        {POPULAR_REACTIONS.map((em) => (
                          <button
                            key={em}
                            onClick={() => handleToggleReaction(msg.id, em)}
                            className="text-base hover:scale-125 transition-transform p-1 rounded hover:bg-[#FAF9F5]"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reaction Chips */}
                  {Object.keys(msg.reactions).length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? "justify-end" : "justify-start"}`}>
                      {Object.entries(msg.reactions).map(([emoji, uids]) => {
                        const userReacted = uids.includes(userId);
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                              userReacted
                                ? "bg-[#F7ECE6] border border-[#CC5A37] text-[#CC5A37] font-semibold"
                                : "bg-white border border-[#E5E3DC] text-[#6F6D66] hover:border-[#CC5A37]"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="font-mono text-[10px]">{uids.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Typing Notification Banner */}
        {typingUsers.length > 0 && (
          <div className="px-6 py-1.5 text-xs text-[#CC5A37] italic flex items-center gap-2 bg-[#FAF9F5]">
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-[#CC5A37] rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-[#CC5A37] rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-[#CC5A37] rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </span>
            <span>{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...</span>
          </div>
        )}

        {/* Active Reply Banner */}
        {replyTarget && (
          <div className="mx-4 sm:mx-6 mb-2 p-2.5 rounded-xl bg-white border border-[#CC5A37]/30 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 text-xs truncate">
              <CornerDownRight className="w-4 h-4 text-[#CC5A37] shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-[#1F1E1D]">Replying to {replyTarget.senderName}: </span>
                <span className="text-[#6F6D66] italic">{replyTarget.content}</span>
              </div>
            </div>
            <button
              onClick={() => setReplyTarget(null)}
              className="text-[#6F6D66] hover:text-[#1F1E1D] p-1 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Box Dock */}
        <div className="p-4 sm:p-6 bg-white border-t border-[#E5E3DC] shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2.5">
            <div className="flex-1 bg-[#FAF9F5] border border-[#E5E3DC] focus-within:border-[#CC5A37] focus-within:ring-1 focus-within:ring-[#CC5A37] rounded-2xl p-2 transition-all flex flex-col">
              <textarea
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder={`Speak in #${roomName}... (Enter to send, Shift+Enter for newline)`}
                className="w-full bg-transparent border-0 resize-none text-sm text-[#1F1E1D] placeholder:text-[#9B988F] focus:outline-none max-h-32 px-1"
              />
              <div className="flex items-center justify-between pt-1 border-t border-transparent">
                <div className="flex items-center gap-1">
                  {POPULAR_REACTIONS.slice(0, 4).map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setInputText((prev) => prev + em)}
                      className="text-xs hover:scale-125 transition-transform px-1 py-0.5 rounded text-[#6F6D66] hover:text-[#1F1E1D]"
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-[#9B988F] font-mono pr-1">
                  markdown supported
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="h-12 w-12 rounded-2xl bg-[#CC5A37] hover:bg-[#B84E2E] text-white flex items-center justify-center shrink-0 shadow-warm transition-all disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
