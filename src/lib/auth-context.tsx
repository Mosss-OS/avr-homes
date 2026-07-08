/**
 * Authentication context provider and hook for managing user sessions.
 *
 * Supports both agent and admin authentication flows — login, registration,
 * logout, and automatic session restoration from localStorage.
 *
 * @module auth-context
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, ApiError } from "./api-client";
import type { AuthResponse, UserData, RegisterPayload } from "./types";

/** Shape of the auth context value exposed to consumers. */
interface AuthContextType {
  user: UserData | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  isAgent: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Provides authentication state and actions to the component tree.
 *
 * On mount, attempts to restore a session from `auth_token` in localStorage
 * by calling `/api/auth/me`. Exposes `login`, `adminLogin`, `register`, and
 * `logout` callbacks, plus derived boolean flags `isAgent` / `isAdmin`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("auth_token");
    if (stored) {
      setToken(stored);
      api.get<UserData>("/api/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("refresh_token");
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/api/auth/agent/login", { email, password });
    localStorage.setItem("auth_token", res.data.token);
    localStorage.setItem("refresh_token", res.data.refresh_token);
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const adminLogin = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/api/auth/login", { email, password });
    localStorage.setItem("auth_token", res.data.token);
    localStorage.setItem("refresh_token", res.data.refresh_token);
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await api.post<AuthResponse>("/api/auth/agent/register", payload);
    localStorage.setItem("auth_token", res.data.token);
    localStorage.setItem("refresh_token", res.data.refresh_token);
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      api.post("/api/auth/logout", { refresh_token: refreshToken }).catch(() => {});
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    setToken(null);
    setUser(null);
  }, []);

  const isAgent = user?.role === "agent";
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, adminLogin, register, logout, isAgent, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Returns the current auth context. Must be called within an `<AuthProvider>`.
 *
 * @throws {Error} If no auth context is found (not wrapped in AuthProvider).
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
