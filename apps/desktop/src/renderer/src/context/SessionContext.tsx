import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type ApiUser } from "@/lib/api";

type SessionState = {
  user: ApiUser | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signInWithOtp: (destination: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await api.auth.me();
        if (alive) setUser(me);
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      user,
      loading,
      async signIn(identifier, password) {
        const u = await api.auth.login(identifier, password);
        setUser(u);
      },
      async signInWithOtp(destination, code) {
        const res = await api.auth.verifyOtp({ destination, code, purpose: "LOGIN" });
        if (!res.tokens) throw new Error("Verified but no session returned");
        const u = await api.auth.me();
        setUser(u);
      },
      async signOut() {
        await api.auth.logout();
        setUser(null);
      }
    }),
    [user, loading]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
