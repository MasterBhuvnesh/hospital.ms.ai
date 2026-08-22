import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setOnUnauthorized, type ApiUser } from "@/lib/api";
import { tokenStore } from "@/lib/storage";

type AuthState = {
  user: ApiUser | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (input: { fullName: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOnUnauthorized(() => setUser(null));
    (async () => {
      try {
        const refresh = await tokenStore.getRefresh();
        if (!refresh) return;
        const me = await api.auth.me();
        setUser(me);
      } catch {
        await tokenStore.clear();
      } finally {
        setLoading(false);
      }
    })();
    return () => setOnUnauthorized(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async signIn(identifier, password) {
        setUser(await api.auth.login(identifier, password));
      },
      async signUp(input) {
        setUser(await api.auth.register(input));
      },
      async signOut() {
        const refresh = await tokenStore.getRefresh();
        await api.auth.logout(refresh);
        setUser(null);
      },
      async refreshUser() {
        setUser(await api.auth.me());
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
