"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, AuthResponse } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    username: string,
    password: string,
    name?: string,
    avatar?: string,
    bio?: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: (
    name?: string,
    avatar?: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (payload: {
    credential?: string;
    profile?: { email: string; name: string; picture?: string; sub?: string };
  }) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: {
    name?: string;
    avatar?: string;
    bio?: string;
    newPassword?: string;
    oldPassword?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("ayeraa_token");
    const savedUserStr = localStorage.getItem("ayeraa_user");

    if (savedToken) {
      setToken(savedToken);
      if (savedUserStr) {
        try {
          setUser(JSON.parse(savedUserStr));
        } catch {
          // ignore parsing error
        }
      }

      // Verify token with backend
      fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem("ayeraa_user", JSON.stringify(data.user));
            localStorage.setItem("ayeraachat_user_name", data.user.name);
            localStorage.setItem("ayeraachat_user_avatar", data.user.avatar);
          } else {
            // Token expired or invalid
            localStorage.removeItem("ayeraa_token");
            localStorage.removeItem("ayeraa_user");
            setUser(null);
            setToken(null);
          }
        })
        .catch(() => {
          // Offline / network failure: keep cached user if present
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleAuthSuccess = useCallback((resultToken: string, resultUser: User, credentialToken?: string) => {
    setToken(resultToken);
    setUser(resultUser);
    localStorage.setItem("ayeraa_token", resultToken);
    localStorage.setItem("ayeraa_user", JSON.stringify(resultUser));
    localStorage.setItem("ayeraachat_user_name", resultUser.name);
    localStorage.setItem("ayeraachat_user_avatar", resultUser.avatar);
    if (credentialToken) {
      localStorage.setItem(`ayeraa_cred_${resultUser.username.toLowerCase()}`, credentialToken);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const cleanUser = username.trim().toLowerCase();
      const cachedCred = localStorage.getItem(`ayeraa_cred_${cleanUser}`) || undefined;

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUser, password, credentialToken: cachedCred }),
      });
      const data: AuthResponse = await res.json();
      if (data.success && data.token && data.user) {
        handleAuthSuccess(data.token, data.user, data.credentialToken);
        return { success: true };
      }
      return { success: false, error: data.error || "Gagal masuk ke akun." };
    } catch {
      return { success: false, error: "Gagal terhubung ke server autentikasi." };
    }
  };

  const register = async (
    username: string,
    password: string,
    name?: string,
    avatar?: string,
    bio?: string
  ) => {
    try {
      const cleanUser = username.trim().toLowerCase();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUser, password, name, avatar, bio }),
      });
      const data: AuthResponse = await res.json();
      if (data.success && data.token && data.user) {
        handleAuthSuccess(data.token, data.user, data.credentialToken);
        return { success: true };
      }
      return { success: false, error: data.error || "Gagal mendaftar akun baru." };
    } catch {
      return { success: false, error: "Gagal terhubung ke server pendaftaran." };
    }
  };

  const loginAsGuest = async (name?: string, avatar?: string) => {
    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatar }),
      });
      const data: AuthResponse = await res.json();
      if (data.success && data.token && data.user) {
        handleAuthSuccess(data.token, data.user, data.credentialToken);
        return { success: true };
      }
      return { success: false, error: data.error || "Gagal masuk sebagai tamu." };
    } catch {
      return { success: false, error: "Gagal terhubung ke server autentikasi tamu." };
    }
  };

  const loginWithGoogle = async (payload: {
    credential?: string;
    profile?: { email: string; name: string; picture?: string; sub?: string };
  }) => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: AuthResponse = await res.json();
      if (data.success && data.token && data.user) {
        handleAuthSuccess(data.token, data.user);
        return { success: true };
      }
      return { success: false, error: data.error || "Gagal autentikasi via Google." };
    } catch {
      return { success: false, error: "Koneksi ke layanan Google gagal." };
    }
  };

  const updateProfile = async (updates: {
    name?: string;
    avatar?: string;
    bio?: string;
    newPassword?: string;
    oldPassword?: string;
  }) => {
    if (!token) return { success: false, error: "Belum masuk." };
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      const data: AuthResponse = await res.json();
      if (data.success && data.user) {
        if (data.token) {
          handleAuthSuccess(data.token, data.user);
        } else {
          setUser(data.user);
          localStorage.setItem("ayeraa_user", JSON.stringify(data.user));
          localStorage.setItem("ayeraachat_user_name", data.user.name);
          localStorage.setItem("ayeraachat_user_avatar", data.user.avatar);
        }
        return { success: true };
      }
      return { success: false, error: data.error || "Gagal memperbarui profil." };
    } catch {
      return { success: false, error: "Gagal memperbarui data profil." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/me", { method: "POST" });
    } catch {
      // ignore
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem("ayeraa_token");
    localStorage.removeItem("ayeraa_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        loginAsGuest,
        loginWithGoogle,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
