import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, setAuthToken } from "../api/client.js";
import type { User } from "../api/types.js";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "sprintforge.token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    setAuthToken(stored);
    api
      .get<{ user: User }>("/api/auth/me")
      .then((res) => {
        setToken(stored);
        setUser(res.user);
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setAuthToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const applySession = useCallback((nextToken: string, nextUser: User) => {
    localStorage.setItem(STORAGE_KEY, nextToken);
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ token: string; user: User }>("/api/auth/login", {
        email,
        password,
      });
      applySession(res.token, res.user);
    },
    [applySession],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await api.post<{ token: string; user: User }>("/api/auth/register", {
        email,
        password,
        name,
      });
      applySession(res.token, res.user);
    },
    [applySession],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
