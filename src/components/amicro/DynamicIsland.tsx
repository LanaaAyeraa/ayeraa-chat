"use client";

import React, { useState, useEffect } from "react";
import { Activity, Check, Copy, Volume2, VolumeX, Users } from "lucide-react";

interface DynamicIslandProps {
  roomName: string;
  roomId: string;
  memberCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onCopyLink: () => void;
  copied: boolean;
}

export function DynamicIsland({
  roomName,
  roomId,
  memberCount,
  soundEnabled,
  onToggleSound,
  onCopyLink,
  copied,
}: DynamicIslandProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (copied) {
      setExpanded(true);
      const t = setTimeout(() => setExpanded(false), 2200);
      return () => clearTimeout(t);
    }
  }, [copied]);

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out">
      <div
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => !copied && setExpanded(false)}
        className={`bg-zinc-900/90 border border-zinc-700/80 rounded-full shadow-2xl backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] px-3.5 py-1.5 flex items-center gap-3 text-xs select-none ${
          expanded ? "scale-[1.02] shadow-[0_0_25px_rgba(99,102,241,0.2)]" : "hover:border-zinc-500"
        }`}
      >
        {/* Status Indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-zinc-100 max-w-[120px] sm:max-w-[180px] truncate">
            {roomName}
          </span>
        </div>

        <div className="h-3 w-px bg-zinc-700" />

        {/* Members Count */}
        <div className="flex items-center gap-1 text-zinc-400 font-mono text-[11px]">
          <Users className="w-3 h-3 text-zinc-400" />
          <span>{memberCount}</span>
        </div>

        {/* Dynamic Expanded Controls */}
        <div
          className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            expanded ? "max-w-xs opacity-100" : "max-w-0 opacity-0 pointer-events-none"
          }`}
        >
          <div className="h-3 w-px bg-zinc-700" />
          
          <button
            onClick={onCopyLink}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400 animate-amicro-pop" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Share</span>
              </>
            )}
          </button>

          <button
            onClick={onToggleSound}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-100 transition-transform active:scale-90"
            title={soundEnabled ? "Mute chimes" : "Enable chimes"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
