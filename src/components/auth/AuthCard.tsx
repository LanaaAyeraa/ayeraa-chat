"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { AVATAR_OPTIONS, processAvatarImage } from "@/lib/utils";
import { SpotlightCard } from "@/components/amicro/SpotlightCard";
import { TextShimmer } from "@/components/amicro/TextShimmer";
import { Avatar } from "@/components/ui/Avatar";
import {
  Lock,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Camera,
  Upload,
  RefreshCw,
} from "lucide-react";

export function AuthCard({ onSuccess }: { onSuccess?: () => void }) {
  const { login, register, loginAsGuest } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("⚡");
  const [bio, setBio] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }

    setLoading(true);
    const res = await login(username.trim(), password);
    setLoading(false);

    if (res.success) {
      setSuccessMsg("Berhasil masuk! Mengalihkan...");
      onSuccess?.();
    } else {
      setError(res.error || "Gagal masuk.");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setError("Username minimal 3 karakter.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    const res = await register(
      cleanUsername,
      password,
      name.trim() || cleanUsername,
      avatar,
      bio.trim()
    );
    setLoading(false);

    if (res.success) {
      setSuccessMsg("Akun berhasil dibuat! Selamat datang di Ayeraa Chat.");
      onSuccess?.();
    } else {
      setError(res.error || "Gagal mendaftar.");
    }
  };

  return (
    <SpotlightCard className="w-full max-w-md mx-auto p-6 md:p-8 border border-zinc-800 bg-zinc-950/90 backdrop-blur-xl shadow-2xl rounded-2xl relative overflow-hidden">
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-700 via-zinc-400 to-zinc-700 opacity-60" />

      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 mb-3 shadow-inner">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ayeraa Secure Portal</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-100 tracking-tight">
          {mode === "login" ? "Masuk ke " : "Daftar Akun "}
          <TextShimmer className="text-zinc-100 font-black">Ayeraa Chat</TextShimmer>
        </h2>
        <p className="text-xs md:text-sm text-zinc-400 mt-1.5">
          {mode === "login"
            ? "Masukkan username & password untuk masuk."
            : "Buat akun sekali jalan, langsung aktif tanpa ribet."}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-zinc-900/80 p-1 border border-zinc-800/80 mb-6">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setSuccessMsg(null);
          }}
          className={`flex-1 py-2 text-xs md:text-sm font-medium rounded-lg transition-all duration-200 ${
            mode === "login"
              ? "bg-zinc-800 text-zinc-100 shadow-md font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          }`}
        >
          Masuk
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError(null);
            setSuccessMsg(null);
          }}
          className={`flex-1 py-2 text-xs md:text-sm font-medium rounded-lg transition-all duration-200 ${
            mode === "register"
              ? "bg-zinc-800 text-zinc-100 shadow-md font-semibold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          }`}
        >
          Daftar Baru
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form: LOGIN */}
      {mode === "login" && (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="username_kamu"
                required
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition-all duration-150 shadow-md flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Guest Login Option */}
          <div className="relative my-3 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <span className="relative bg-zinc-950 px-2 text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
              atau
            </span>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setError(null);
              const res = await loginAsGuest();
              setLoading(false);
              if (res.success) {
                setSuccessMsg("Masuk sebagai Tamu! Mengalihkan...");
                onSuccess?.();
              } else {
                setError(res.error || "Gagal masuk sebagai tamu.");
              }
            }}
            className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Masuk Cepat sebagai Tamu (Guest)</span>
          </button>
        </form>
      )}

      {/* Form: REGISTER */}
      {mode === "register" && (
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Username <span className="text-zinc-500">(ID unik, 3-24 karakter)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                placeholder="nama_pengguna"
                required
                className="w-full pl-8 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Nama Tampilan <span className="text-zinc-500">(Display Name)</span>
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Keren Kamu"
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
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
                  <span>Pilih Foto Sendiri</span>
                </button>
                <p className="text-[10px] text-zinc-400 mt-1 truncate">
                  Auto-crop 1:1 persegi (JPG, PNG, WebP)
                </p>
              </div>
            </div>

            {/* Quick emoji presets */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
              {AVATAR_OPTIONS.slice(0, 10).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAvatar(opt)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all shrink-0 ${
                    avatar === opt
                      ? "bg-zinc-700 border-2 border-zinc-300 scale-105"
                      : "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 huruf"
                required
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Ulangi
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Konfirmasi"
                required
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Bio / Status Singkat <span className="text-zinc-500">(Opsional)</span>
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Obrolan santai & room explorer"
              maxLength={80}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition-all duration-150 shadow-md flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Daftar Akun Sekarang</span>
              </>
            )}
          </button>
        </form>
      )}
    </SpotlightCard>
  );
}
