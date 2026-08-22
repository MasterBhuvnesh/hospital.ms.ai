import { tokenStore } from "./storage";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://backend-demo-hms.onrender.com";

export type ApiUser = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  roles: { role: string; hospitalId: string | null }[];
};

export type ApiTokens = { accessToken: string; refreshToken: string };

export type Appointment = {
  id: string;
  doctorId: string;
  hospitalId: string;
  startsAt: string;
  date: string;
  status: "BOOKED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  reason: string | null;
  tokenId: string | null;
  feeSnapshot?: { amount: number; currency: string };
};

export type Token = {
  id: string;
  consultationId: string;
  appointmentId: string | null;
  tokenNumber: number;
  tokenDate: string;
  priority: "EMERGENCY" | "SENIOR_CITIZEN" | "WOMAN_CHILD" | "NORMAL";
  status:
    | "WAITING"
    | "CALLED"
    | "IN_CONSULTATION"
    | "COMPLETED"
    | "SKIPPED"
    | "NO_SHOW";
  doctorName: string;
  patientName: string;
  position?: number | null;
  etaMinutes?: number | null;
  paymentStatus?: string;
};

export type Doctor = {
  id: string;
  fullName: string;
  specializations: string[];
  feeConfig: { amount: number; currency: string };
};

type Envelope<T> = { status: string; code: string; data: T; error?: { code: string; message: string } };

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: (() => void) | null) {
  onUnauthorized = fn;
}

const res_ok = (s: number) => s >= 200 && s < 300;

async function raw<T>(
  path: string,
  init?: RequestInit & { auth?: boolean },
): Promise<{ status: number; body: Envelope<T> }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (init?.auth !== false) {
    const access = await tokenStore.getAccess();
    if (access) headers.Authorization = `Bearer ${access}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("NETWORK", "Cannot reach the server. It may be waking up - try again in a minute.", undefined);
  }
  const body = (await res.json().catch(() => ({}))) as Envelope<T>;
  return { status: res.status, body };
}

async function request<T>(path: string, init?: RequestInit & { auth?: boolean }, retried = false): Promise<T> {
  const { status, body } = await raw<T>(path, init);
  if (status === 401 && !retried && init?.auth !== false) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, init, true);
    onUnauthorized?.();
  }
  if (!res_ok(status)) {
    throw new ApiError(
      body?.error?.code ?? "ERROR",
      body?.error?.message ?? `Request failed (${status})`,
      status,
    );
  }
  return body.data;
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const refreshToken = await tokenStore.getRefresh();
      if (!refreshToken) return false;
      const { status, body } = await raw<{ tokens: ApiTokens }>("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
        auth: false,
      });
      if (status !== 200 || !body.data?.tokens) return false;
      await tokenStore.save(body.data.tokens.accessToken, body.data.tokens.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export const api = {
  auth: {
    async login(identifier: string, password: string) {
      const data = await request<{ user: ApiUser; tokens: ApiTokens }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ identifier, password }), auth: false },
      );
      await tokenStore.save(data.tokens.accessToken, data.tokens.refreshToken);
      return data.user;
    },
    async register(input: { fullName: string; email: string; password: string }) {
      const data = await request<{ user: ApiUser; tokens: ApiTokens }>(
        "/api/auth/register",
        { method: "POST", body: JSON.stringify(input), auth: false },
      );
      await tokenStore.save(data.tokens.accessToken, data.tokens.refreshToken);
      return data.user;
    },
    async me() {
      return request<{ user: ApiUser }>("/api/auth/me").then((r) => r.user);
    },
    async logout(refreshToken: string | null) {
      try {
        await raw("/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
          auth: false,
        });
      } finally {
        await tokenStore.clear();
      }
    },
  },

  async myPatient() {
    return request<null | { id: string; fullName: string; phone: string | null }>("/api/clinical/patients/me");
  },

  async doctors(): Promise<Doctor[]> {
    const data = await request<{ items: Doctor[] }>("/api/directory/doctors");
    return data.items;
  },

  async appointments(): Promise<Appointment[]> {
    const data = await request<{ items: Appointment[] }>("/api/scheduling/appointments?limit=50");
    return data.items;
  },

  async bookAppointment(input: { doctorId: string; startsAt: string; reason?: string }) {
    return request<Appointment>("/api/scheduling/appointments", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Idempotency-Key": `${Date.now()}-${Math.random().toString(36).slice(2)}` },
    });
  },

  async mintToken(appointmentId: string) {
    return request<Token>("/api/scheduling/tokens", {
      method: "POST",
      body: JSON.stringify({ appointmentId }),
    });
  },

  async token(tokenId: string) {
    return request<Token>(`/api/scheduling/tokens/${tokenId}`);
  },

  async notifications() {
    return request<{
      items: { id: string; subject: string; body: string; readAt: string | null; createdAt: string }[];
      unreadCount: number;
      total: number;
    }>("/api/comms/notifications");
  },
};
