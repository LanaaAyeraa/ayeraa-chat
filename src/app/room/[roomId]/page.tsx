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
} from "lucide-react";
import { Message, Participant, ReplyContext } from "@/types/chat";
import { formatTimestamp, AVATAR_OPTIONS } from "@/lib/utils";
import { sound } from "@/lib/sound";
import { DynamicIsland } from "@/components/amicro/DynamicIsland";

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
  const userNameRef = useRef<string>(userName);
  const userAvatarRef = useRef<string>(userAvatar);

  useEffect(() => {
    userNameRef.current = userName;
    userAvatarRef.current = userAvatar;
  }, [userName, userAvatar]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let uid = localStorage.getItem("ayeraachat_user_id") || localStorage.getItem("havenchat_user_id");
    if (!uid) {
      uid = `u-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem("ayeraachat_user_id", uid);
      localStorage.setItem("havenchat_user_id", uid);
    }
    setUserId(uid);

    const savedName = localStorage.getItem("ayeraachat_user_name") || localStorage.getItem("havenchat_user_name") || "Anonymous Explorer";
    const savedAvatar = localStorage.getItem("ayeraachat_user_avatar") || localStorage.getItem("havenchat_user_avatar") || "⚡";
    setUserName(savedName);
    setUserAvatar(savedAvatar);
    userNameRef.current = savedName;
    userAvatarRef.current = savedAvatar;
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
          const incoming = (data.room.participants as Participant[]) || [];
          setParticipants((prev) => {
            const map = new Map<string, Participant>();
            for (const p of incoming) {
              map.set(p.id, { ...p, isOnline: true });
            }
            if (!map.has(uid)) {
              map.set(uid, {
                id: uid,
                name: savedName,
                avatar: savedAvatar,
                joinedAt: Date.now(),
                lastActiveAt: Date.now(),
                isTyping: false,
                isOnline: true,
              });
            }
            return Array.from(map.values());
          });
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
        const currentName = userNameRef.current || userName;
        const currentAvatar = userAvatarRef.current || userAvatar;
        const queryParams = new URLSearchParams({
          since: since.toString(),
          userId,
          userName: currentName,
          userAvatar: currentAvatar,
        });

        const res = await fetch(`/api/rooms/${roomId}/poll?${queryParams.toString()}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.success) {
          if (data.roomName) setRoomName(data.roomName);
          
          if (data.participants) {
            setParticipants((prev) => {
              const map = new Map<string, Participant>();

              // 1. Preserve previously known participants (set isOnline to false as fallback)
              for (const p of prev) {
                map.set(p.id, { ...p, isOnline: false });
              }

              // 2. Overlay incoming participants from server
              for (const inc of data.participants as Participant[]) {
                map.set(inc.id, {
                  ...inc,
                  isOnline: inc.isOnline !== undefined ? inc.isOnline : true,
                });
              }

              // 3. Current user MUST ALWAYS be online on their own client
              const existingMe = map.get(userId);
              map.set(userId, {
                id: userId,
                name: currentName || existingMe?.name || "You",
                avatar: currentAvatar || existingMe?.avatar || "⚡",
                joinedAt: existingMe?.joinedAt || Date.now(),
                lastActiveAt: Date.now(),
                isTyping: existingMe?.isTyping || false,
                isOnline: true,
              });

              // 4. Stable sort: You first, then online users, then others
              return Array.from(map.values()).sort((a, b) => {
                if (a.id === userId) return -1;
                if (b.id === userId) return 1;
                const aOnline = a.isOnline !== false;
                const bOnline = b.isOnline !== false;
                if (aOnline && !bOnline) return -1;
                if (!aOnline && bOnline) return 1;
                return b.lastActiveAt - a.lastActiveAt;
              });
            });
          }

          if (data.typingUsers) setTypingUsers(data.typingUsers);

          if (data.messages && data.messages.length > 0) {
            // Guarantee any message sender is also registered in participants map
            setParticipants((prev) => {
              let changed = false;
              const map = new Map(prev.map((p) => [p.id, p]));
              for (const msg of data.messages as Message[]) {
                if (!msg.isSystem && msg.senderId && !map.has(msg.senderId)) {
                  map.set(msg.senderId, {
                    id: msg.senderId,
                    name: msg.senderName,
                    avatar: msg.senderAvatar,
                    joinedAt: msg.timestamp,
                    lastActiveAt: msg.timestamp,
                    isTyping: false,
                    isOnline: Date.now() - msg.timestamp < 90000,
                  });
                  changed = true;
                }
              }
              return changed ? Array.from(map.values()) : prev;
            });

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

  const onlineCount = Math.max(1, participants.filter((p) => p.isOnline !== false).length);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden selection:bg-zinc-800 relative">
      {/* Amicro Top Dynamic Island Component */}
      <DynamicIsland
        roomName={roomName}
        roomId={roomId}
        memberCount={onlineCount}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onCopyLink={handleCopyLink}
        copied={copied}
      />

      {/* Left Sidebar (Desktop shadcn panel) */}
      <aside className="w-72 border-r border-zinc-800 bg-zinc-900/60 flex flex-col justify-between hidden md:flex shrink-0 backdrop-blur-md">
        <div>
          {/* Room Header Info */}
          <div className="p-4 border-b border-zinc-800">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-all duration-150 active:scale-95 mb-3"
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
                className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700/80 px-2.5 py-1 rounded-md transition-all duration-150 active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 animate-amicro-pop" /> : <Copy className="w-3.5 h-3.5" />}
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
                {onlineCount} online
              </span>
            </div>

            <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {participants.map((p) => {
                const isMe = p.id === userId;
                const isOnline = p.isOnline !== false;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2 rounded-lg transition-all duration-150 ${
                      isMe ? "bg-zinc-800/80 text-zinc-100 shadow-sm" : "hover:bg-zinc-800/50 text-zinc-300 hover:text-zinc-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="relative">
                        <span className="text-base transition-transform hover:scale-110 cursor-default">{p.avatar}</span>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-zinc-900 ${
                            isOnline
                              ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                              : "bg-zinc-500"
                          }`}
                        ></span>
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-medium truncate flex items-center gap-1.5">
                          <span className={`truncate ${isOnline ? "text-zinc-200" : "text-zinc-400"}`}>{p.name}</span>
                          {isMe && (
                            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-1 rounded">
                              you
                            </span>
                          )}
                        </p>
                        {p.isTyping ? (
                          <p className="text-[10px] text-indigo-400 italic animate-pulse">
                            typing...
                          </p>
                        ) : (
                          <p className="text-[10px] text-zinc-500 font-mono">
                            {isOnline ? "online" : "away"}
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
            <span className="text-lg transition-transform hover:scale-110">{userAvatar}</span>
            <div className="text-xs truncate max-w-[120px]">
              <p className="font-medium text-zinc-200 truncate">{userName}</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span> Online
              </p>
            </div>
          </div>
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Mute audio" : "Enable audio"}
            className="p-1.5 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-all duration-150 active:scale-90"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-zinc-300" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full bg-zinc-950 relative pt-12 md:pt-0">
        {/* Mobile Navbar Header */}
        <header className="h-14 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between px-4 md:hidden shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="text-zinc-400 hover:text-zinc-100 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-semibold text-sm text-zinc-100 truncate max-w-[150px]">
                {roomName}
              </h1>
              <p className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {onlineCount} online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="p-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 transition-transform active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleSound}
              className="p-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 transition-transform active:scale-95"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-zinc-200" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Message Timeline */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Welcome Card Banner */}
          <div className="border border-zinc-800 bg-zinc-900/40 rounded-2xl p-5 max-w-md mx-auto text-center shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-200 flex items-center justify-center mx-auto mb-2.5 shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="font-semibold text-sm text-zinc-100">{roomName}</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Real-time room stream active. Invite your peers with code:{" "}
              <span className="font-mono font-semibold text-zinc-200">{roomId}</span>
            </p>
          </div>

          {/* Messages Stream with Amicro Entrance Animation */}
          {messages.map((msg) => {
            const isMe = msg.senderId === userId;

            if (msg.isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2 animate-amicro-message">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-400 font-mono shadow-sm">
                    <span>{msg.senderAvatar}</span>
                    <span>{msg.content}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`group flex items-start gap-2.5 animate-amicro-message ${
                  isMe ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm shrink-0 shadow-sm mt-0.5 transition-transform hover:scale-110">
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
                      className={`text-xs p-2 rounded-lg mb-1 border-l-2 bg-zinc-900/90 border-zinc-500 text-zinc-400 shadow-sm ${
                        isMe ? "text-right" : "text-left"
                      }`}
                    >
                      <p className="font-medium text-[11px] text-zinc-300">
                        Replying to {msg.replyTo.senderName}
                      </p>
                      <p className="truncate text-[11px] mt-0.5 text-zinc-400">{msg.replyTo.content}</p>
                    </div>
                  )}

                  {/* Message Bubble (Amicro Spring Tactile) */}
                  <div
                    className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-150 ${
                      isMe
                        ? "bg-zinc-100 text-zinc-950 rounded-tr-sm font-normal shadow-[0_2px_10px_rgba(255,255,255,0.06)]"
                        : "bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-tl-sm hover:border-zinc-700"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                    {/* Floating Hover Actions (Amicro Spring Pill) */}
                    <div
                      className={`absolute -top-3.5 ${
                        isMe ? "left-2" : "right-2"
                      } hidden group-hover:flex items-center gap-1 bg-zinc-900 border border-zinc-700/80 px-2 py-0.5 rounded-full shadow-xl z-10 animate-amicro-pop`}
                    >
                      {POPULAR_REACTIONS.slice(0, 3).map((em) => (
                        <button
                          key={em}
                          onClick={() => handleToggleReaction(msg.id, em)}
                          className="hover:scale-130 active:scale-90 text-xs transition-transform px-0.5"
                        >
                          {em}
                        </button>
                      ))}
                      <button
                        onClick={() =>
                          setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)
                        }
                        className="text-zinc-400 hover:text-zinc-200 active:scale-90 transition-transform text-xs px-1"
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
                        className="text-zinc-400 hover:text-zinc-200 active:scale-90 transition-transform text-xs px-1"
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
                        } bg-zinc-900 border border-zinc-700 p-2 rounded-xl shadow-2xl flex gap-1.5 z-20 animate-amicro-pop`}
                      >
                        {POPULAR_REACTIONS.map((em) => (
                          <button
                            key={em}
                            onClick={() => handleToggleReaction(msg.id, em)}
                            className="text-base hover:scale-125 active:scale-90 transition-transform p-1 rounded hover:bg-zinc-800"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reaction Badges with Pop Animation */}
                  {Object.keys(msg.reactions).length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? "justify-end" : "justify-start"}`}>
                      {Object.entries(msg.reactions).map(([emoji, uids]) => {
                        const userReacted = uids.includes(userId);
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-all duration-150 hover:scale-105 active:scale-90 ${
                              userReacted
                                ? "bg-zinc-800 border border-zinc-500 text-zinc-100 font-semibold shadow-sm animate-amicro-pop"
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

        {/* Typing Notification with Wave Animation */}
        {typingUsers.length > 0 && (
          <div className="px-6 py-1.5 text-xs text-zinc-400 italic flex items-center gap-2 bg-zinc-950">
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-amicro-wave [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-amicro-wave [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-amicro-wave"></span>
            </span>
            <span>{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...</span>
          </div>
        )}

        {/* Active Reply Banner */}
        {replyTarget && (
          <div className="mx-4 sm:mx-6 mb-2 p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-between shadow-lg animate-amicro-pop">
            <div className="flex items-center gap-2 text-xs truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <div className="truncate">
                <span className="font-medium text-zinc-200">Replying to {replyTarget.senderName}: </span>
                <span className="text-zinc-400">{replyTarget.content}</span>
              </div>
            </div>
            <button
              onClick={() => setReplyTarget(null)}
              className="text-zinc-400 hover:text-zinc-100 p-1 transition-transform active:scale-90"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Box Dock (Amicro Tactile Dock) */}
        <div className="p-4 sm:p-5 bg-zinc-950 border-t border-zinc-800/90 shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <div className="flex-1 bg-zinc-900/90 border border-zinc-800 focus-within:border-zinc-600 rounded-2xl p-2.5 transition-all duration-200 flex flex-col shadow-inner">
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
                      className="text-xs hover:scale-130 active:scale-90 transition-transform px-1 py-0.5 rounded text-zinc-400 hover:text-zinc-200"
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono pr-1">
                  amicro ready
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="h-11 w-11 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center shrink-0 shadow-sm transition-all duration-150 active:scale-[0.94] hover:shadow-[0_0_15px_rgba(255,255,255,0.25)] disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
