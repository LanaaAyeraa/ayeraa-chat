"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageSquare, X, ArrowRight, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sound } from "@/lib/sound";
import { Avatar } from "@/components/ui/Avatar";
import { DmNotification } from "@/lib/notificationStore";

export function DmNotificationManager() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [activeToast, setActiveToast] = useState<DmNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Request browser desktop notification permission once user interacts
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        const handleFirstClick = () => {
          Notification.requestPermission().catch(() => {});
          window.removeEventListener("click", handleFirstClick);
        };
        window.addEventListener("click", handleFirstClick, { once: true });
      }
    }
  }, []);

  // Poll for new unread DM notifications
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const checkNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          const notifs: DmNotification[] = data.notifications;
          setUnreadCount(data.unreadCount || notifs.length);

          // Find brand-new notifications not yet seen
          const newNotifs = notifs.filter((n) => !seenNotificationIdsRef.current.has(n.id));

          // Mark existing ones as seen in memory
          for (const n of notifs) {
            seenNotificationIdsRef.current.add(n.id);
          }

          // If this is not the initial page load and we have a new notification:
          if (!initialLoadRef.current && newNotifs.length > 0) {
            const latest = newNotifs[0];

            // Only trigger toast & chime if user is NOT currently inside this DM room
            const currentRoomId = pathname?.startsWith("/room/") ? pathname.replace("/room/", "") : "";
            if (currentRoomId.toLowerCase() !== latest.dmRoomId.toLowerCase()) {
              // 1. Play chime sound
              sound.playDmChime();

              // 2. Show in-app floating banner
              setActiveToast(latest);
              if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
              toastTimeoutRef.current = setTimeout(() => {
                setActiveToast(null);
              }, 7000);

              // 3. Browser native notification (works if tab is backgrounded / minimized)
              if (
                typeof window !== "undefined" &&
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                try {
                  const sysNotif = new Notification(`DM dari ${latest.senderName}`, {
                    body: latest.content,
                    icon: "/favicon.ico",
                  });
                  sysNotif.onclick = () => {
                    window.focus();
                    router.push(`/room/${latest.dmRoomId}`);
                    sysNotif.close();
                  };
                } catch {}
              }
            }
          }

          initialLoadRef.current = false;
        }
      } catch {}
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 3500);

    return () => {
      clearInterval(interval);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [user, pathname, router]);

  if (!activeToast) return null;

  return (
    <div className="fixed top-5 right-5 z-[100] max-w-sm w-full animate-amicro-pop pointer-events-auto">
      <div className="bg-zinc-900/95 border border-indigo-500/40 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(99,102,241,0.25)] backdrop-blur-xl flex flex-col gap-3 text-zinc-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-indigo-400 font-mono">
              Pesan Pribadi Baru
            </span>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start gap-3">
          <Avatar src={activeToast.senderAvatar} size="md" className="shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-100 truncate">{activeToast.senderName}</p>
            <p className="text-xs text-zinc-300 line-clamp-2 mt-0.5 leading-relaxed">
              {activeToast.content}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80">
          <button
            onClick={() => {
              const target = activeToast.dmRoomId;
              setActiveToast(null);
              router.push(`/room/${target}`);
            }}
            className="flex-1 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
          >
            <span>Buka Obrolan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveToast(null)}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 px-3 rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
