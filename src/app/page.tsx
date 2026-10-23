"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Sparkles, ArrowRight, Compass, ShieldCheck, Zap, Volume2, Users } from "lucide-react";
import { generateRoomSlug, AVATAR_OPTIONS } from "@/lib/utils";

interface PublicRoom {
  id: string;
  name: string;
  participantsCount: number;
  messageCount: number;
}

export default function HomePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("☕");
  const [roomSlug, setRoomSlug] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);

  useEffect(() => {
    // Generate initial friendly room slug
    setRoomSlug(generateRoomSlug());

    // Load saved user profile
    const savedName = localStorage.getItem("havenchat_user_name");
    const savedAvatar = localStorage.getItem("havenchat_user_avatar");
    if (savedName) setName(savedName);
    if (savedAvatar) setAvatar(savedAvatar);

    // Fetch active rooms
    fetch("/api/rooms")
      .then((res) => res.json())
      .then((data) => {
        if (data.rooms) setPublicRooms(data.rooms);
      })
      .catch(() => {});
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || "Gentle Traveler";
    const finalSlug = (roomSlug.trim() || generateRoomSlug()).toLowerCase();

    // Persist profile
    localStorage.setItem("havenchat_user_name", finalName);
    localStorage.setItem("havenchat_user_avatar", avatar);

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
    if (!joinCode.trim()) return;

    const finalName = name.trim() || "Gentle Traveler";
    localStorage.setItem("havenchat_user_name", finalName);
    localStorage.setItem("havenchat_user_avatar", avatar);

    const cleanCode = joinCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    router.push(`/room/${cleanCode}`);
  };

  return (
    <main className="min-h-screen bg-[#FAF9F5] flex flex-col justify-between selection:bg-[#CC5A37]/20">
      {/* Top Navigation */}
      <header className="border-b border-[#E5E3DC] bg-[#FAF9F5]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#CC5A37] flex items-center justify-center text-white shadow-warm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif font-bold text-xl tracking-tight text-[#1F1E1D]">HavenChat</span>
              <span className="ml-2 text-xs font-mono uppercase tracking-widest text-[#6F6D66] bg-[#EFECE6] px-2 py-0.5 rounded-full">v1.0</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs text-[#6F6D66]">
            <span className="flex items-center gap-1.5 bg-[#FAF9F5] border border-[#E5E3DC] px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Vercel Serverless Ready
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-16 flex-1 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E5E3DC] bg-white text-xs font-medium text-[#CC5A37] mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Frictionless Real-time Web Rooms</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-normal text-[#1F1E1D] tracking-tight leading-[1.2]">
            Conversation in its purest, most thoughtful state.
          </h1>
          <p className="mt-3 text-[#6F6D66] text-base leading-relaxed">
            Create an intimate space, share a private link, and converse freely with real-time presence, rich reactions, and zero registration friction.
          </p>
        </div>

        {/* Interactive Room Console */}
        <div className="max-w-xl mx-auto bg-white border border-[#E5E3DC] rounded-2xl shadow-warm p-6 sm:p-8">
          {/* Identity Customizer */}
          <div className="mb-6 pb-6 border-b border-[#EFECE6]">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#6F6D66] mb-2">
              Your Persona in the Room
            </label>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="w-12 h-12 rounded-xl bg-[#FAF9F5] border border-[#E5E3DC] flex items-center justify-center text-2xl cursor-pointer hover:border-[#CC5A37] transition-all">
                  {avatar}
                </div>
              </div>
              <input
                type="text"
                placeholder="Enter your display name (e.g. Alice)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                className="flex-1 bg-[#FAF9F5] border border-[#E5E3DC] rounded-xl px-4 py-2.5 text-sm text-[#1F1E1D] placeholder:text-[#9B988F] focus:outline-none focus:border-[#CC5A37] focus:ring-1 focus:ring-[#CC5A37] transition-all"
              />
            </div>

            {/* Avatar Selector Tray */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-xs text-[#6F6D66] mr-1">Avatar:</span>
              {AVATAR_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAvatar(em)}
                  className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                    avatar === em
                      ? "bg-[#CC5A37]/10 border border-[#CC5A37] scale-110"
                      : "hover:bg-[#FAF9F5]"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-[#EFECE6] mb-6">
            <button
              onClick={() => setActiveTab("create")}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all ${
                activeTab === "create"
                  ? "border-[#CC5A37] text-[#CC5A37]"
                  : "border-transparent text-[#6F6D66] hover:text-[#1F1E1D]"
              }`}
            >
              Create New Room
            </button>
            <button
              onClick={() => setActiveTab("join")}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all ${
                activeTab === "join"
                  ? "border-[#CC5A37] text-[#CC5A37]"
                  : "border-transparent text-[#6F6D66] hover:text-[#1F1E1D]"
              }`}
            >
              Join Existing Room
            </button>
          </div>

          {/* Form Content */}
          {activeTab === "create" ? (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#6F6D66] mb-1.5">
                  Room Topic or Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Design Sync, Late Night Coding, Book Club"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  maxLength={50}
                  className="w-full bg-[#FAF9F5] border border-[#E5E3DC] rounded-xl px-4 py-2.5 text-sm text-[#1F1E1D] placeholder:text-[#9B988F] focus:outline-none focus:border-[#CC5A37] focus:ring-1 focus:ring-[#CC5A37] transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#6F6D66]">
                    Room Code / Slug
                  </label>
                  <button
                    type="button"
                    onClick={() => setRoomSlug(generateRoomSlug())}
                    className="text-xs text-[#CC5A37] hover:underline"
                  >
                    Generate Another
                  </button>
                </div>
                <div className="flex items-center">
                  <span className="bg-[#EFECE6] border border-r-0 border-[#E5E3DC] text-[#6F6D66] text-xs px-3 py-2.5 rounded-l-xl font-mono">
                    haven/
                  </span>
                  <input
                    type="text"
                    value={roomSlug}
                    onChange={(e) => setRoomSlug(e.target.value)}
                    required
                    className="w-full bg-[#FAF9F5] border border-[#E5E3DC] rounded-r-xl px-4 py-2.5 text-sm font-mono text-[#1F1E1D] focus:outline-none focus:border-[#CC5A37] focus:ring-1 focus:ring-[#CC5A37] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#CC5A37] hover:bg-[#B84E2E] text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 shadow-warm transition-all disabled:opacity-60"
              >
                <span>{loading ? "Creating Sanctuary..." : "Enter Room"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#6F6D66] mb-1.5">
                  Enter Room Code or Invite Link
                </label>
                <input
                  type="text"
                  placeholder="e.g. warm-hearth-402 or full link"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  required
                  className="w-full bg-[#FAF9F5] border border-[#E5E3DC] rounded-xl px-4 py-2.5 text-sm font-mono text-[#1F1E1D] placeholder:text-[#9B988F] focus:outline-none focus:border-[#CC5A37] focus:ring-1 focus:ring-[#CC5A37] transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-[#1F1E1D] hover:bg-[#2A2826] text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 shadow-warm transition-all"
              >
                <span>Join Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Active Rooms Pill List */}
          {publicRooms.length > 0 && (
            <div className="mt-8 pt-6 border-t border-[#EFECE6]">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#6F6D66] mb-3">
                <Compass className="w-3.5 h-3.5 text-[#CC5A37]" />
                <span>Active Havens Right Now</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {publicRooms.slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => router.push(`/room/${r.id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF9F5] hover:bg-[#F7ECE6] border border-[#E5E3DC] text-xs text-[#1F1E1D] transition-all"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-[#6F6D66] text-[10px]">({r.participantsCount} online)</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-12 text-left">
          <div className="p-4 rounded-xl border border-[#E5E3DC] bg-white shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#F7ECE6] text-[#CC5A37] flex items-center justify-center mb-2.5">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-bold text-sm text-[#1F1E1D]">Zero-Lag Delta Sync</h3>
            <p className="text-xs text-[#6F6D66] mt-1 leading-relaxed">
              Adaptive delta streaming delivers sub-second messaging with automatic reconnection fallback.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[#E5E3DC] bg-white shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#F7ECE6] text-[#CC5A37] flex items-center justify-center mb-2.5">
              <Volume2 className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-bold text-sm text-[#1F1E1D]">Tactile Audio Feedback</h3>
            <p className="text-xs text-[#6F6D66] mt-1 leading-relaxed">
              Synthesized Web Audio clicks and chimes designed to feel organic, warm, and toggleable.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[#E5E3DC] bg-white shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-[#F7ECE6] text-[#CC5A37] flex items-center justify-center mb-2.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-bold text-sm text-[#1F1E1D]">Ephemeral & Private</h3>
            <p className="text-xs text-[#6F6D66] mt-1 leading-relaxed">
              No tracking, no passwords to forget. Share a private code or keep it between close friends.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E5E3DC] py-6 text-center text-xs text-[#6F6D66] bg-[#FAF9F5]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 HavenChat — Built with Claude Warm Minimalist Aesthetic.</p>
          <p className="font-mono text-[11px] text-[#9B988F]">
            Orchestrated by Antigravity × Hermes × OpenCode × OpenClaw × OMP
          </p>
        </div>
      </footer>
    </main>
  );
}
