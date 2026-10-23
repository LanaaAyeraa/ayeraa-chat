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

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function processAvatarImage(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File harus berupa gambar (JPG, PNG, WebP)"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context tidak tersedia"));
          return;
        }

        // Center crop to 1:1 square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        // Convert to WebP or JPEG with quality 0.85
        let dataUrl = "";
        try {
          dataUrl = canvas.toDataURL("image/webp", 0.85);
        } catch {
          dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        }
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const AVATAR_OPTIONS = [
  "🦊", "🌿", "☕", "🍂", "🦉", "🕯️", "🌌", "🪴", "🎨", "📻", "🍵", "🧭",
  "⚡", "🚀", "🪐", "🔥", "💎", "👾", "🛡️", "👑", "🦄", "🎧", "🎯", "✨"
];
