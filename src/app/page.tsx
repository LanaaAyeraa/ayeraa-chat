"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Volume2,
  RefreshCw,
  Hash,
  Activity,
  Lock,
  Search,
  UserCheck,
} from "lucide-react";
import { generateRoomSlug, getDmRoomId, formatChatTime } from "@/lib/utils";
import { SpotlightCard } from "@/components/amicro/SpotlightCard";
import { TextShimmer } from "@/components/amicro/TextShimmer";
import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/auth/AuthCard";
import { UserBar } from "@/components/auth/UserBar";
import { Avatar } from "@/components/ui/Avatar";

interface PublicRoom {
  id: string;
  name: string;
  participantsCount: number;
  messageCount: number;
}

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [roomSlug, setRoomSlug] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"messages" | "create" | "join" | "search">("messages");
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [conversations, setConversations] = useState<
    Array<{
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
    }>
  >([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [chatFilter, setChatFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; username: string; avatar: string }>
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Poll conversations (IG/WhatsApp chat threads)
  const loadConversations = () => {
    if (!user) return;
    fetch(`/api/conversations?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!user) return;
    setConversationsLoading(true);
    fetch(`/api/conversations?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
        }
      })
      .catch(() => {})
      .finally(() => setConversationsLoading(false));

    const timer = setInterval(loadConversations, 4000);
    return () => clearInterval(timer);
  }, [user]);

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  useEffect(() => {
    setRoomSlug(generateRoomSlug());

    fetch("/api/rooms")
      .then((res) => res.json())
      .then((data) => {
        if (data.rooms) setPublicRooms(data.rooms);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab !== "search") return;
    setSearchLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.users)) {
            setSearchResults(data.users);
          }
        })
        .catch(() => {})
        .finally(() => setSearchLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const finalSlug = (roomSlug.trim() || generateRoomSlug()).toLowerCase();

    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: finalSlug,
          name: roomTitle.trim() || finalSlug,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/room/${data.room.id}`);
      } else {
        router.push(`/room/${finalSlug}`);
      }
    } catch {
      router.push(`/room/${finalSlug}`);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !user) return;

    const cleanCode = joinCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    router.push(`/room/${cleanCode}`);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-zinc-800 relative overflow-hidden">
      {/* Background Subtle Radial Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-b from-indigo-500/10 via-zinc-900/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-950 shadow-sm font-bold transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer">
              <MessageSquare className="w-4 h-4 fill-current" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight text-zinc-100">Ayeraa Chat</span>
              <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                Auth Guarded
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-full text-zinc-300 shadow-sm transition-all hover:border-zinc-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              </span>
              <span className="font-mono text-[11px] text-zinc-400">Vercel Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-16 flex-1 w-full flex flex-col items-center">
        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="my-auto py-24 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-zinc-700 border-t-zinc-200 rounded-full animate-spin" />
            <p className="text-xs text-zinc-400 font-mono">Memeriksa autentikasi...</p>
          </div>
        ) : !user ? (
          /* Authentication Screen (Strict Gate) */
          <div className="w-full flex flex-col items-center my-auto">
            <div className="text-center max-w-xl mx-auto mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/80 text-xs font-medium text-zinc-300 mb-4 shadow-sm">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <TextShimmer>Login Wajib Diperlukan</TextShimmer>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight leading-tight">
                Ruang Obrolan Eksklusif. <span className="bg-gradient-to-r from-zinc-100 via-indigo-200 to-zinc-400 bg-clip-text text-transparent">Masuk untuk Memulai.</span>
              </h1>
              <p className="mt-2.5 text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                Silakan masuk dengan akun Ayeraa atau Google untuk membuat room, berkirim pesan, dan berbagi berkas secara aman.
              </p>
            </div>

            <AuthCard />
          </div>
        ) : (
          /* Authenticated Dashboard */
          <>
            <div className="text-center max-w-2xl mx-auto mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/80 text-xs font-medium text-zinc-300 mb-4 shadow-sm transition-transform hover:scale-[1.02]">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <TextShimmer>Frictionless Real-Time Rooms</TextShimmer>
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-100 tracking-tight leading-[1.15]">
                Instant rooms. <span className="bg-gradient-to-r from-zinc-100 via-indigo-200 to-zinc-400 bg-clip-text text-transparent">Micro-fluid transitions.</span>
              </h1>
              <p className="mt-3 text-zinc-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
                Buat room terisolasi dalam hitungan detik. Bagikan link atau kode, obrol realtime dengan kirim file, gambar, dan reaksi kinetik.
              </p>
            </div>

            {/* Authenticated User Profile Pill */}
            <UserBar />

            {/* Interactive Console Card (Amicro SpotlightCard) */}
            <SpotlightCard
              spotlightColor="rgba(99, 102, 241, 0.15)"
              className="w-full max-w-lg bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md"
            >
              {/* Segmented Control / Tabs */}
              <div className="grid grid-cols-4 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 mb-6">
                <button
                  onClick={() => setActiveTab("messages")}
                  className={`py-2 text-xs font-medium rounded-lg transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5 relative ${
                    activeTab === "messages"
                      ? "bg-zinc-800 text-zinc-100 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pesan</span>
                  {totalUnread > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                      {totalUnread}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("create")}
                  className={`py-2 text-xs font-medium rounded-lg transition-all duration-150 active:scale-95 ${
                    activeTab === "create"
                      ? "bg-zinc-800 text-zinc-100 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Buat Room
                </button>
                <button
                  onClick={() => setActiveTab("join")}
                  className={`py-2 text-xs font-medium rounded-lg transition-all duration-150 active:scale-95 ${
                    activeTab === "join"
                      ? "bg-zinc-800 text-zinc-100 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Gabung
                </button>
                <button
                  onClick={() => setActiveTab("search")}
                  className={`py-2 text-xs font-medium rounded-lg transition-all duration-150 active:scale-95 flex items-center justify-center gap-1 ${
                    activeTab === "search"
                      ? "bg-zinc-800 text-zinc-100 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Cari</span>
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "messages" ? (
                /* WhatsApp / Instagram Style Direct Message Threads */
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari dalam pesan..."
                      value={chatFilter}
                      onChange={(e) => setChatFilter(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800/90 rounded-xl pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {conversationsLoading && conversations.length === 0 ? (
                      <div className="py-10 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs font-mono">
                        <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
                        <span>Memuat percakapan...</span>
                      </div>
                    ) : conversations.length > 0 ? (
                      conversations
                        .filter(
                          (c) =>
                            c.peerName.toLowerCase().includes(chatFilter.toLowerCase()) ||
                            (c.peerUsername &&
                              c.peerUsername.toLowerCase().includes(chatFilter.toLowerCase())) ||
                            c.lastMessageSnippet.toLowerCase().includes(chatFilter.toLowerCase())
                        )
                        .map((c) => (
                          <div
                            key={c.roomId}
                            onClick={() => router.push(`/room/${c.roomId}`)}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-150 cursor-pointer group active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="relative shrink-0">
                                <Avatar src={c.peerAvatar} size="md" />
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-zinc-950 ${
                                    c.peerIsOnline
                                      ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                                      : "bg-zinc-500"
                                  }`}
                                />
                              </div>
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <p className="text-xs font-semibold text-zinc-100 truncate group-hover:text-white transition-colors">
                                    {c.peerName}
                                  </p>
                                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                    {formatChatTime(c.lastMessageTimestamp)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <p
                                    className={`text-xs truncate ${
                                      c.unreadCount > 0
                                        ? "text-zinc-100 font-semibold"
                                        : "text-zinc-400"
                                    }`}
                                  >
                                    {c.lastMessageSnippet}
                                  </p>
                                  {c.unreadCount > 0 && (
                                    <span className="bg-rose-500 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                                      {c.unreadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      /* Empty state */
                      <div className="py-10 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3 shadow-sm">
                          <MessageSquare className="w-6 h-6 text-zinc-400" />
                        </div>
                        <p className="text-xs font-semibold text-zinc-200">Belum ada obrolan</p>
                        <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                          Mulai obrolan pribadi dengan mencari teman melalui nama atau username mereka.
                        </p>
                        <button
                          onClick={() => setActiveTab("search")}
                          className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Cari Pengguna</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === "create" ? (
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Topik atau Nama Room <span className="text-zinc-500">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Engineering Sync, Obrolan Santai"
                      value={roomTitle}
                      onChange={(e) => setRoomTitle(e.target.value)}
                      maxLength={50}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-zinc-300">
                        Room Slug / ID
                      </label>
                      <button
                        type="button"
                        onClick={() => setRoomSlug(generateRoomSlug())}
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-all duration-150 active:rotate-180"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Acak Ulang</span>
                      </button>
                    </div>
                    <div className="flex items-center">
                      <span className="bg-zinc-950 border border-r-0 border-zinc-800 text-zinc-400 text-xs px-3 py-2.5 rounded-l-xl font-mono flex items-center gap-1">
                        <Hash className="w-3 h-3 text-zinc-500" />
                      </span>
                      <input
                        type="text"
                        value={roomSlug}
                        onChange={(e) => setRoomSlug(e.target.value)}
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-r-xl px-3.5 py-2.5 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-[0.97] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50"
                  >
                    <span>{loading ? "Menyiapkan Room..." : "Luncurkan Room"}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </form>
              ) : activeTab === "join" ? (
                <form onSubmit={handleJoinRoom} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Masukkan Kode / Slug Room
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. cozy-sanctuary-402 atau kode unik"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-[0.97]"
                  >
                    <span>Masuk ke Room</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Search & Direct Message Tab */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Cari Pengguna Terdaftar
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Ketik nama atau @username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Results List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {searchLoading ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs font-mono">
                        <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
                        <span>Mencari pengguna...</span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-150"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar src={u.avatar} size="md" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-zinc-100 truncate">{u.name}</p>
                              <p className="text-[11px] text-zinc-400 font-mono truncate">@{u.username}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (!user) return;
                              const dmRoom = getDmRoomId(user.id, u.id);
                              router.push(`/room/${dmRoom}`);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm transition-all duration-150 active:scale-95 shrink-0"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Kirim DM</span>
                          </button>
                        </div>
                      ))
                    ) : searchQuery.trim().length > 0 ? (
                      <div className="py-8 text-center text-xs text-zinc-500">
                        Tidak ada pengguna yang cocok dengan &quot;{searchQuery}&quot;
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-zinc-500">
                        Belum ada pengguna lain yang ditemukan. Bagikan link room ke teman untuk mendaftar!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Active Public Rooms */}
              {publicRooms.length > 0 && (
                <div className="mt-6 pt-5 border-t border-zinc-800/80">
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Room Aktif Saat Ini</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {publicRooms.slice(0, 5).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => router.push(`/room/${r.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-300 transition-all duration-150 hover:scale-105 active:scale-95"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                        <span className="font-medium text-zinc-200">{r.name}</span>
                        <span className="text-zinc-500 text-[10px]">({r.participantsCount})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </SpotlightCard>

            {/* Feature Cards Grid (Amicro SpotlightCards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto mt-12 w-full text-left">
              <SpotlightCard
                spotlightColor="rgba(99, 102, 241, 0.12)"
                className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-800 text-indigo-400 flex items-center justify-center mb-2.5 shadow-sm">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-zinc-100">Zero-Lag Delta Sync</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Long-polling cerdas dengan fallback delta hemat kuota & latency rendah.
                </p>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(16, 185, 129, 0.12)"
                className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-800 text-emerald-400 flex items-center justify-center mb-2.5 shadow-sm">
                  <Volume2 className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-zinc-100">Web Audio FX</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Sintesis suara organic chimes saat kirim pesan, reaksi, dan join.
                </p>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(245, 158, 11, 0.12)"
                className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-800 text-amber-400 flex items-center justify-center mb-2.5 shadow-sm">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-zinc-100">Amicro Micro-Physics</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Transisi mikro fluida, dynamic island status capsule, dan spotlight hover.
                </p>
              </SpotlightCard>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-5 text-center text-xs text-zinc-500 bg-zinc-950">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p>© 2026 Ayeraa Chat • Engineered with shadcn/ui × Amicro Motion</p>
          <p className="font-mono text-[11px] text-zinc-500">
            Powered by Antigravity × Hermes × OpenCode × OpenClaw × OMP
          </p>
        </div>
      </footer>
    </main>
  );
}
