"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/types";
import * as api from "@/lib/api";

const TOKEN_KEY = api.AUTH_TOKEN_KEY;

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
  }, []);

  const loadUser = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setUserState(null);
      setIsLoading(false);
      return;
    }
    try {
      const me = await api.getMe();
      setUserState(me);
    } catch {
      api.clearAuthToken();
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      localStorage.setItem(TOKEN_KEY, res.accessToken);
      setUserState(res.user);
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await api.register(email, password, name);
      localStorage.setItem(TOKEN_KEY, res.accessToken);
      setUserState(res.user);
    },
    []
  );

  const logout = useCallback(() => {
    api.clearAuthToken();
    setUserState(null);
    if (typeof window !== "undefined") {
      const segments = window.location.pathname.split("/").filter(Boolean);
      const locales = ["en", "ko", "id"];
      const locale = segments.length && locales.includes(segments[0]) ? segments[0] : "en";
      window.location.href = locale === "en" ? "/login" : `/${locale}/login`;
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    setUser: setUserState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
