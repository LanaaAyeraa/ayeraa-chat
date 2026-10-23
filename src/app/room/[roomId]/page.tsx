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
  Sparkles,
  Hash,
  Activity,
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
  const [userAvatar, setUserAvatar] = useState<string>("⚡");
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

    const savedName = localStorage.getItem("havenchat_user_name") || "Anonymous Explorer";
    const savedAvatar = localStorage.getItem("havenchat_user_avatar") || "⚡";
    setUserName(savedName);
    setUserAvatar(savedAvatar);
    setSoundEnabled(sound.isEnabled());

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
                map.set(inc.id, inc);
              }

              if (hasNewIncoming) {
                sound.playReceive();
              }

              return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
            });

            const maxTs = Math.max(
              ...data.messages.map((m: Message) => Math.max(m.timestamp, m.updatedAt || 0)),
              lastTimestampRef.current
            );
            lastTimestampRef.current = maxTs;
            setTimeout(scrollToBottom, 60);
          }
        }
      } catch {
        // silent recovery
      }
    };

    fetchDelta();

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

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content || !userId) return;

    sound.playSend();
    setInputText("");
    const reply = replyTarget;
    setReplyTarget(null);

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
      // recovery
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    sound.playReaction();
    setShowEmojiPicker(null);

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
        return { ...msg, reactions: nextReactions, updatedAt: Date.now() };
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

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    sound.setEnabled(nextVal);
    setSoundEnabled(nextVal);
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden selection:bg-zinc-800">
      {/* Left Sidebar (Desktop shadcn panel) */}
      <aside className="w-72 border-r border-zinc-800 bg-zinc-900/60 flex flex-col justify-between hidden md:flex shrink-0 backdrop-blur-md">
        <div>
          {/* Room Header Info */}
          <div className="p-4 border-b border-zinc-800">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Rooms</span>
            </Link>
            <h2 className="font-semibold text-base text-zinc-100 tracking-tight truncate flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="truncate">{roomName}</span>
            </h2>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-md text-zinc-400 truncate max-w-[150px]">
                {roomId}
              </span>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700/80 px-2.5 py-1 rounded-md transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Invite"}</span>
              </button>
            </div>
          </div>

          {/* Participants Presence List */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>Members</span>
              </div>
              <span className="text-[11px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                {participants.length}
              </span>
            </div>

            <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {participants.map((p) => {
                const isMe = p.id === userId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                      isMe ? "bg-zinc-800/80 text-zinc-100" : "hover:bg-zinc-850 text-zinc-300 hover:text-zinc-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="relative">
                        <span className="text-base">{p.avatar}</span>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-zinc-900"></span>
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-medium truncate flex items-center gap-1.5">
                          <span className="truncate">{p.name}</span>
                          {isMe && (
                            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-1 rounded">
                              you
                            </span>
                          )}
                        </p>
                        {p.isTyping && (
                          <p className="text-[10px] text-indigo-400 italic animate-pulse">
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
        <div className="p-3.5 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <span className="text-lg">{userAvatar}</span>
            <div className="text-xs truncate max-w-[120px]">
              <p className="font-medium text-zinc-200 truncate">{userName}</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
              </p>
            </div>
          </div>
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Mute audio" : "Enable audio"}
            className="p-1.5 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-zinc-300" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full bg-zinc-950 relative">
        {/* Mobile Navbar Header */}
        <header className="h-14 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between px-4 md:hidden shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="text-zinc-400 hover:text-zinc-100">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-semibold text-sm text-zinc-100 truncate max-w-[150px]">
                {roomName}
              </h1>
              <p className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {participants.length} online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="p-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleSound}
              className="p-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-zinc-200" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Message Timeline */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Welcome Card Banner */}
          <div className="border border-zinc-800 bg-zinc-900/40 rounded-2xl p-5 max-w-md mx-auto text-center shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-200 flex items-center justify-center mx-auto mb-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="font-semibold text-sm text-zinc-100">{roomName}</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Real-time room stream active. Invite your peers with code:{" "}
              <span className="font-mono font-semibold text-zinc-200">{roomId}</span>
            </p>
          </div>

          {/* Messages Stream */}
          {messages.map((msg) => {
            const isMe = msg.senderId === userId;

            if (msg.isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-400 font-mono">
                    <span>{msg.senderAvatar}</span>
                    <span>{msg.content}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`group flex items-start gap-2.5 ${
                  isMe ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm shrink-0 shadow-sm mt-0.5">
                  {msg.senderAvatar}
                </div>

                {/* Bubble Container */}
                <div className={`max-w-[85%] sm:max-w-md ${isMe ? "items-end text-right" : "items-start text-left"}`}>
                  <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                    <span className="text-xs font-medium text-zinc-300">{msg.senderName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>

                  {/* Quoted Reply */}
                  {msg.replyTo && (
                    <div
                      className={`text-xs p-2 rounded-lg mb-1 border-l-2 bg-zinc-900 border-zinc-500 text-zinc-400 ${
                        isMe ? "text-right" : "text-left"
                      }`}
                    >
                      <p className="font-medium text-[11px] text-zinc-300">
                        Replying to {msg.replyTo.senderName}
                      </p>
                      <p className="truncate text-[11px] mt-0.5 text-zinc-400">{msg.replyTo.content}</p>
                    </div>
                  )}

                  {/* Message Bubble (shadcn standard) */}
                  <div
                    className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-colors ${
                      isMe
                        ? "bg-zinc-100 text-zinc-950 rounded-tr-sm font-normal"
                        : "bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-tl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                    {/* Floating Hover Actions (shadcn tooltip style) */}
                    <div
                      className={`absolute -top-3.5 ${
                        isMe ? "left-2" : "right-2"
                      } hidden group-hover:flex items-center gap-1 bg-zinc-900 border border-zinc-700/80 px-2 py-0.5 rounded-full shadow-xl z-10`}
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
                        className="text-zinc-400 hover:text-zinc-200 text-xs px-1"
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
                        className="text-zinc-400 hover:text-zinc-200 text-xs px-1"
                        title="Reply"
                      >
                        <CornerDownRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Emoji Popover */}
                    {showEmojiPicker === msg.id && (
                      <div
                        className={`absolute top-full mt-2 ${
                          isMe ? "left-0" : "right-0"
                        } bg-zinc-900 border border-zinc-700 p-2 rounded-xl shadow-2xl flex gap-1.5 z-20`}
                      >
                        {POPULAR_REACTIONS.map((em) => (
                          <button
                            key={em}
                            onClick={() => handleToggleReaction(msg.id, em)}
                            className="text-base hover:scale-125 transition-transform p-1 rounded hover:bg-zinc-800"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reaction Badges */}
                  {Object.keys(msg.reactions).length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? "justify-end" : "justify-start"}`}>
                      {Object.entries(msg.reactions).map(([emoji, uids]) => {
                        const userReacted = uids.includes(userId);
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-colors ${
                              userReacted
                                ? "bg-zinc-800 border border-zinc-600 text-zinc-100 font-semibold"
                                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700"
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

        {/* Typing Notification */}
        {typingUsers.length > 0 && (
          <div className="px-6 py-1 text-xs text-zinc-400 italic flex items-center gap-2 bg-zinc-950">
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </span>
            <span>{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...</span>
          </div>
        )}

        {/* Active Reply Banner */}
        {replyTarget && (
          <div className="mx-4 sm:mx-6 mb-2 p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 text-xs truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <div className="truncate">
                <span className="font-medium text-zinc-200">Replying to {replyTarget.senderName}: </span>
                <span className="text-zinc-400">{replyTarget.content}</span>
              </div>
            </div>
            <button
              onClick={() => setReplyTarget(null)}
              className="text-zinc-400 hover:text-zinc-100 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Box Dock (shadcn input dock) */}
        <div className="p-4 sm:p-5 bg-zinc-950 border-t border-zinc-800/90 shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <div className="flex-1 bg-zinc-900/90 border border-zinc-800 focus-within:border-zinc-600 rounded-2xl p-2.5 transition-colors flex flex-col">
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
                placeholder={`Message #${roomName}... (Enter to send)`}
                className="w-full bg-transparent border-0 resize-none text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none max-h-32 px-1"
              />
              <div className="flex items-center justify-between pt-1 border-t border-transparent">
                <div className="flex items-center gap-1">
                  {POPULAR_REACTIONS.slice(0, 4).map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setInputText((prev) => prev + em)}
                      className="text-xs hover:scale-125 transition-transform px-1 py-0.5 rounded text-zinc-400 hover:text-zinc-200"
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono pr-1">
                  markdown ready
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="h-11 w-11 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center shrink-0 shadow-sm transition-all active:scale-[0.98] disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
