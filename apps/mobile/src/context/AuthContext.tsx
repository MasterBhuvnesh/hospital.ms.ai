import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { api, setOnUnauthorized, type ApiUser } from "@/lib/api";
import { tokenStore, getOrCreateDeviceId } from "@/lib/storage";

type AuthState = {
  user: ApiUser | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (input: { fullName: string; email: string; password: string }) => Promise<void>;
  signInWithOtp: (destination: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
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

  async function postAuth() {
    const me = await api.auth.me();
    setUser(me);
    try {
      const deviceId = await getOrCreateDeviceId();
      await api.auth.upsertDevice({ deviceId, name: "This device", platform: Platform.OS as any });
    } catch {}
  }

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async signIn(identifier, password) {
        await api.auth.login(identifier, password);
        await postAuth();
      },
      async signUp(input) {
        await api.auth.register(input);
        await postAuth();
      },
      async signInWithOtp(destination, code) {
        const res = await api.auth.verifyOtp({ destination, code, purpose: "LOGIN" });
        if (!res.tokens) throw new Error("Verification succeeded but no session was returned");
        await postAuth();
      },
      async signOut() {
        const refresh = await tokenStore.getRefresh();
        await api.auth.logout(refresh);
        setUser(null);
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
