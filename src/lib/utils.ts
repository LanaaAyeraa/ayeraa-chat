import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRoomSlug(): string {
  const adjectives = [
    "warm",
    "cozy",
    "amber",
    "silent",
    "velvet",
    "golden",
    "serene",
    "stellar",
    "gentle",
    "terracotta",
    "solaris",
    "ayeraa",
  ];
  const nouns = [
    "room",
    "lounge",
    "hearth",
    "nook",
    "garden",
    "oasis",
    "parlor",
    "sanctuary",
    "alcove",
    "retreat",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}-${noun}-${num}`;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const AVATAR_OPTIONS = [
  "🦊", "🌿", "☕", "🍂", "🦉", "🕯️", "🌌", "🪴", "🎨", "📻", "🍵", "🧭"
];
