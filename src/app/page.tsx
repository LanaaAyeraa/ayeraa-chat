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
} from "lucide-react";
import { generateRoomSlug, AVATAR_OPTIONS } from "@/lib/utils";
import { SpotlightCard } from "@/components/amicro/SpotlightCard";
import { TextShimmer } from "@/components/amicro/TextShimmer";

interface PublicRoom {
  id: string;
  name: string;
  participantsCount: number;
  messageCount: number;
}

export default function HomePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("⚡");
  const [roomSlug, setRoomSlug] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);

  useEffect(() => {
    setRoomSlug(generateRoomSlug());

    const savedName = localStorage.getItem("havenchat_user_name");
    const savedAvatar = localStorage.getItem("havenchat_user_avatar");
    if (savedName) setName(savedName);
    if (savedAvatar) setAvatar(savedAvatar);

    fetch("/api/rooms")
      .then((res) => res.json())
      .then((data) => {
        if (data.rooms) setPublicRooms(data.rooms);
      })
      .catch(() => {});
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || "Anonymous Explorer";
    const finalSlug = (roomSlug.trim() || generateRoomSlug()).toLowerCase();

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

    const finalName = name.trim() || "Anonymous Explorer";
    localStorage.setItem("havenchat_user_name", finalName);
    localStorage.setItem("havenchat_user_avatar", avatar);

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
              <span className="font-semibold text-base tracking-tight text-zinc-100">HavenChat</span>
              <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                shadcn × amicro
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

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-16 flex-1 w-full flex flex-col items-center">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/80 text-xs font-medium text-zinc-300 mb-5 shadow-sm transition-transform hover:scale-[1.02]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <TextShimmer>Frictionless Real-Time Rooms</TextShimmer>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-100 tracking-tight leading-[1.15]">
            Instant rooms. <span className="bg-gradient-to-r from-zinc-100 via-indigo-200 to-zinc-400 bg-clip-text text-transparent">Micro-fluid transitions.</span>
          </h1>
          <p className="mt-3.5 text-zinc-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            Spin up an isolated chat room in seconds. Share the link, converse in real-time with kinetic reactions, quoted replies, and amicro physics.
          </p>
        </div>

        {/* Interactive Console Card (Amicro SpotlightCard) */}
        <SpotlightCard
          spotlightColor="rgba(99, 102, 241, 0.15)"
          className="w-full max-w-lg bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md"
        >
          {/* Persona Picker */}
          <div className="mb-6 pb-6 border-b border-zinc-800/80">
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400 mb-2.5">
              Display Profile
            </label>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-xl shrink-0 shadow-inner transition-transform hover:scale-105">
                {avatar}
              </div>
              <input
                type="text"
                placeholder="Your nickname (e.g. Maverick)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
              />
            </div>

            {/* Quick Avatar Tray with Micro-transitions */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] text-zinc-500 mr-1">Avatar:</span>
              {["⚡", "🚀", "🪐", "🔥", "💎", "🦊", "☕", "👾", "🎨", "🛡️"].map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAvatar(em)}
                  className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all duration-150 active:scale-90 ${
                    avatar === em
                      ? "bg-zinc-800 border border-zinc-600 scale-110 shadow-sm"
                      : "hover:bg-zinc-800/60 hover:scale-105 text-zinc-400"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Segmented Control / Tabs (shadcn style with micro-motion) */}
          <div className="grid grid-cols-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 mb-6">
            <button
              onClick={() => setActiveTab("create")}
              className={`py-2 text-xs font-medium rounded-lg transition-all duration-150 active:scale-95 ${
                activeTab === "create"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Create Room
            </button>
            <button
              onClick={() => setActiveTab("join")}
              className={`py-2 text-xs font-medium rounded-lg transition-all duration-150 active:scale-95 ${
                activeTab === "join"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Join with Code
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "create" ? (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Room Topic or Name <span className="text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering Sync, Late Night Coding"
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
                    <span>Regenerate</span>
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
                <span>{loading ? "Generating Space..." : "Launch Room"}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Enter Room Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. cozy-sanctuary-402 or room pin"
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
                <span>Join Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Active Public Rooms */}
          {publicRooms.length > 0 && (
            <div className="mt-6 pt-5 border-t border-zinc-800/80">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Rooms Active</span>
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
              Adaptive long-polling and event streams with automatic visibility backoff.
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
              Synthesized organic chimes on message send, receive, and reaction events.
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
              Spring-physics pop animations, dynamic island capsules, and tactile feedback.
            </p>
          </SpotlightCard>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-5 text-center text-xs text-zinc-500 bg-zinc-950">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p>© 2026 HavenChat • Engineered with shadcn/ui × Amicro Motion</p>
          <p className="font-mono text-[11px] text-zinc-500">
            Powered by Antigravity × Hermes × OpenCode × OpenClaw × OMP
          </p>
        </div>
      </footer>
    </main>
  );
}
