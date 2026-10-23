"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ProfileModal } from "@/components/auth/ProfileModal";
import { Settings, LogOut, ShieldCheck, Sparkles } from "lucide-react";

export function UserBar() {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <div className="flex items-center justify-between p-3 md:px-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md shadow-lg max-w-xl mx-auto mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-xl shadow-inner">
              {user.avatar.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                user.avatar
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
          </div>

          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-zinc-100">{user.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                @{user.username}
              </span>
              {user.provider === "google" && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-300 font-semibold">
                  Google
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 truncate max-w-[200px] md:max-w-[280px]">
              {user.bio || "Member Ayeraa Chat"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setProfileOpen(true)}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 border border-transparent hover:border-zinc-700/60 transition-all text-xs flex items-center gap-1.5 font-medium"
            title="Pengaturan Profil"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Profil</span>
          </button>
          <button
            onClick={() => {
              if (confirm("Keluar dari akun Ayeraa Chat?")) logout();
            }}
            className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/40 transition-all text-xs"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
