import React, { createContext, useContext, useEffect, useState } from "react";
import { getUserData, removeToken, removeUserData } from "../services/api";
import { authService, User, LoginPayload, RegisterPayload } from "../services/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const stored = await getUserData();
      if (stored) {
        setUser(stored);
      }
    } catch {
      // no stored user
    } finally {
      setLoading(false);
    }
  }

  async function login(payload: LoginPayload) {
    const data = await authService.login(payload);
    setUser(data.user);
  }

  async function register(payload: RegisterPayload) {
    const data = await authService.register(payload);
    setUser(data.user);
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
