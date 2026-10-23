"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ProfileModal } from "@/components/auth/ProfileModal";
import { Avatar } from "@/components/ui/Avatar";
import { Settings, LogOut } from "lucide-react";

export function UserBar() {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <div className="flex items-center justify-between p-3 md:px-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md shadow-lg max-w-xl mx-auto mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar src={user.avatar} size="lg" className="shadow-inner" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
          </div>

          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-zinc-100">{user.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                @{user.username}
              </span>
            </div>
            <p className="text-xs text-zinc-400 truncate max-w-[200px] md:max-w-[280px]">
              {user.bio || "Member Ayeraa Chat"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setProfileOpen(true)}
            className="p-2 px-3 rounded-xl text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-xs flex items-center gap-1.5 font-medium"
            title="Pengaturan Profil"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span>Profil</span>
          </button>
          <button
            onClick={() => logout()}
            className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 transition-all text-xs flex items-center gap-1.5 font-medium active:scale-95"
            title="Keluar Akun"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
