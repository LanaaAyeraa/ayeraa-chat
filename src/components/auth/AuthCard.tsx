"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { AVATAR_OPTIONS } from "@/lib/utils";
import { SpotlightCard } from "@/components/amicro/SpotlightCard";
import { TextShimmer } from "@/components/amicro/TextShimmer";
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
  ExternalLink,
  X,
  Key,
} from "lucide-react";

export function AuthCard({ onSuccess }: { onSuccess?: () => void }) {
  const { login, register, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("⚡");
  const [bio, setBio] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Google OAuth Client ID state & modal
  const [googleClientId, setGoogleClientId] = useState<string>("");
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [inputClientId, setInputClientId] = useState("");
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check env var or localStorage for Client ID
    const envId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const localId = typeof window !== "undefined" ? localStorage.getItem("ayeraa_google_client_id") : null;
    const finalId = envId || localId || "";
    if (finalId) {
      setGoogleClientId(finalId);
    }
  }, []);

  // Initialize Google Identity Services when Client ID is available
  useEffect(() => {
    if (!googleClientId || typeof window === "undefined") return;

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response) => {
              if (response.credential) {
                setGoogleLoading(true);
                setError(null);
                const res = await loginWithGoogle({ credential: response.credential });
                setGoogleLoading(false);
                if (res.success) {
                  setSuccessMsg("Berhasil masuk dengan akun Google!");
                  onSuccess?.();
                } else {
                  setError(res.error || "Gagal autentikasi via Google.");
                }
              }
            },
          });

          // Render hidden or visible Google button
          if (googleBtnContainerRef.current) {
            googleBtnContainerRef.current.innerHTML = "";
            window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
              theme: "filled_black",
              size: "large",
              shape: "rectangular",
              width: 320,
              text: "signin_with",
            });
          }
        } catch {
          // GIS initialization error
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          initGoogle();
        }
      }, 300);
      return () => clearInterval(timer);
    }
  }, [googleClientId, loginWithGoogle, onSuccess]);

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

  const handleGoogleClick = () => {
    setError(null);

    if (!googleClientId) {
      setShowSetupModal(true);
      return;
    }

    // If client ID is present, trigger Google Sign-In prompt/button click
    if (window.google?.accounts?.id) {
      try {
        // Trigger button click if rendered
        const btn = googleBtnContainerRef.current?.querySelector("div[role='button']") as HTMLElement;
        if (btn) {
          btn.click();
        } else {
          window.google.accounts.id.prompt();
        }
      } catch {
        setShowSetupModal(true);
      }
    } else {
      setShowSetupModal(true);
    }
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputClientId.trim();
    if (!clean) return;

    localStorage.setItem("ayeraa_google_client_id", clean);
    setGoogleClientId(clean);
    setShowSetupModal(false);
    setSuccessMsg("Google Client ID disimpan! Menginisialisasi login Google...");
  };

  return (
    <>
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
              ? "Masuk dengan akunmu untuk mulai membuat atau bergabung ke room chat."
              : "Buat akun sekali untuk identitas permanen, avatar kustom, & riwayat room."}
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

        {/* Google Sign-In Trigger Button */}
        <div className="relative mb-5">
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-zinc-900 border border-zinc-700/80 hover:bg-zinc-800 text-zinc-200 text-xs md:text-sm font-medium transition-all duration-150 shadow-sm active:scale-[0.99] disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleLoading ? "Memproses Akun Google..." : "Masuk dengan Google Resmi"}</span>
          </button>

          {/* Hidden container for GIS rendered button */}
          <div ref={googleBtnContainerRef} className="hidden" />
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-zinc-800 w-full" />
          <span className="bg-zinc-950 px-3 text-[10px] uppercase font-semibold tracking-wider text-zinc-500 absolute">
            Atau akun Ayeraa
          </span>
        </div>

        {/* Form: LOGIN */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">
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
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">
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

            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center justify-between">
                <span>Pilih Avatar</span>
                <span className="text-zinc-300 font-bold text-sm">{avatar}</span>
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {AVATAR_OPTIONS.slice(0, 10).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAvatar(opt)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all shrink-0 ${
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
                placeholder="e.g. Frontend builder & room explorer"
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
                  <span>Buat Akun Ayeraa</span>
                </>
              )}
            </button>
          </form>
        )}
      </SpotlightCard>

      {/* Google Setup Guide Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/50 flex items-center justify-center">
                  <Key className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Setup Google Sign-In Resmi</h3>
                  <p className="text-[11px] text-zinc-400">Google OAuth 2.0 Client ID Diperlukan</p>
                </div>
              </div>
              <button
                onClick={() => setShowSetupModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-3">
              Agar popup akun Google resmi muncul dan mengambil foto/email asli bos, masukkan <strong>Google Client ID</strong> di bawah ini:
            </p>

            <form onSubmit={handleSaveClientId} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="xxxxx-xxxxxxx.apps.googleusercontent.com"
                  value={inputClientId}
                  onChange={(e) => setInputClientId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-mono placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1.5">
                <p className="font-semibold text-zinc-300">Cara dapat Google Client ID (Gratis 1 Menit):</p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                  <li>Buka <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-400 underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-2.5 h-2.5" /></a></li>
                  <li>Klik <strong>Create Credentials</strong> → <strong>OAuth Client ID</strong></li>
                  <li>Pilih <strong>Web application</strong></li>
                  <li>Masukkan Authorized Javascript origin: <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">https://haven-chat-eight.vercel.app</code></li>
                  <li>Copy Client ID dan tempel di kotak atas!</li>
                </ol>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md active:scale-[0.98]"
              >
                Simpan & Aktifkan Login Google
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
