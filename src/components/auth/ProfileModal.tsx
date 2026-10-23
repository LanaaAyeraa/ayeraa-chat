"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { AVATAR_OPTIONS, processAvatarImage } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import {
  X,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  Sparkles,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Camera,
  RefreshCw,
} from "lucide-react";

export function ProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user, updateProfile, logout } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "⚡");
  const [bio, setBio] = useState(user?.bio || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processAvatarImage(file, 128);
      setAvatar(dataUrl);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Gagal memproses gambar avatar.");
    }
  };

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const updates: {
      name?: string;
      avatar?: string;
      bio?: string;
      oldPassword?: string;
      newPassword?: string;
    } = {
      name: name.trim() || user.username,
      avatar,
      bio: bio.trim(),
    };

    if (newPassword) {
      updates.oldPassword = oldPassword;
      updates.newPassword = newPassword;
    }

    const res = await updateProfile(updates);
    setLoading(false);

    if (res.success) {
      setSuccess("Profil berhasil diperbarui!");
      setOldPassword("");
      setNewPassword("");
      setTimeout(() => {
        setSuccess(null);
      }, 2500);
    } else {
      setError(res.error || "Gagal memperbarui profil.");
    }
  };

  const handleLogout = async () => {
    if (confirm("Yakin ingin keluar dari akun Ayeraa Chat?")) {
      await logout();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-5">
          <div className="flex items-center gap-2.5">
            <Avatar src={user.avatar} size="md" />
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
                <span>Pengaturan Profil</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                  @{user.username}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Tipe akun: <span className="capitalize text-zinc-300 font-medium">{user.provider}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Nama Tampilan
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          {/* Avatar Selector with Custom Photo Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-400">
                Avatar Profil
              </label>
              {avatar.startsWith("data:") || avatar.startsWith("http") ? (
                <button
                  type="button"
                  onClick={() => setAvatar("⚡")}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset ke Emoji</span>
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <Avatar src={avatar} size="lg" className="shadow-md" />

              <div className="flex-1 min-w-0">
                <input
                  type="file"
                  ref={avatarFileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Ganti Foto Sendiri</span>
                </button>
                <p className="text-[10px] text-zinc-400 mt-1 truncate">
                  Auto-crop 1:1 persegi (JPG, PNG, WebP)
                </p>
              </div>
            </div>

            {/* Quick emoji presets */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
              {AVATAR_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAvatar(opt)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all shrink-0 ${
                    avatar === opt
                      ? "bg-zinc-700 border-2 border-zinc-200 scale-105"
                      : "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Bio / Status
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ceritakan tentangmu..."
              maxLength={100}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          {user.provider === "local" && (
            <div className="pt-2 border-t border-zinc-800/80">
              <label className="block text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                <span>Ganti Password (Opsional)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Password Lama"
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password Baru"
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs md:text-sm transition-all shadow active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 font-medium text-xs md:text-sm transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
