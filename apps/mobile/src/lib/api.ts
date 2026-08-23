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

export type PatientRecord = {
  id: string;
  userId: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  dob: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  bloodGroup: string | null;
  photoUrl?: string | null;
  emergencyContact?: { name?: string; phone?: string } | null;
  insurance?: { provider: string; number: string } | null;
};

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
  qualification?: string | null;
  experienceYears?: number;
  registrationNumber?: string;
  hospitalIds: string[];
  feeConfig: { version: number; amount: number; currency: string };
};

export type Hospital = { id: string; name: string; city: string };

export type Availability = {
  doctorId: string;
  date: string;
  onLeave: boolean;
  checkedIn?: boolean;
  slots: { time: string; available: boolean; reason?: string }[];
};

export type PrescriptionItem = {
  drug: string;
  dose: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
};

export type Prescription = {
  id: string;
  consultationId: string;
  patientId: string;
  status: "DRAFT" | "SIGNED" | "DISPENSED";
  items: PrescriptionItem[];
  notes: string | null;
  pdfUrl: string | null;
  signedAt: string | null;
  fulfilledAt: string | null;
  contentHash: string | null;
  downloadUrl?: string | null;
  doctorSnapshot?: { name: string; registrationNumber: string } | null;
};

export type LabOrder = {
  id: string;
  consultationId: string;
  tests: { code: string; name: string }[];
  priority: "ROUTINE" | "URGENT";
  status: "ORDERED" | "COLLECTED" | "ENTERED" | "RELEASED";
  results: { parameter: string; value: string; unit?: string; referenceRange?: string; flag?: string }[];
  releasedAt: string | null;
  createdAt: string;
};

export type Invoice = {
  id: string;
  invoiceNo: string;
  consultationId: string;
  total: number;
  currency: string;
  status: "UNPAID" | "PAID" | "VOID" | "PARTIALLY_REFUNDED" | "REFUNDED";
  lineItems: { description: string; amount: number; currency: string }[];
  paidAt?: string | null;
  downloadUrl?: string | null;
  createdAt: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "CAPTURED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  capturedAt: string | null;
};

export type AppNotification = {
  id: string;
  category: string;
  subject: string;
  body: string;
  link?: string;
  meta?: Record<string, any>;
  readAt: string | null;
  deliveries?: { channel: string; status: string; error?: string }[];
  createdAt: string;
};

export type DeviceRow = {
  id: string;
  deviceId: string;
  name: string | null;
  platform: string | null;
  lastSeenAt: string;
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
    throw new ApiError("NETWORK", "Cannot reach the server. It may be waking up - tap retry in a minute.", undefined);
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
    async requestOtp(destination: string, purpose: "LOGIN" | "RESET_PASSWORD") {
      return request<{ sent: true; destinationType: string; devCode?: string }>(
        "/api/auth/otp/request",
        { method: "POST", body: JSON.stringify({ destination, purpose }), auth: false },
      );
    },
    async verifyOtp(input: { destination: string; code: string; purpose: "LOGIN" | "RESET_PASSWORD"; newPassword?: string }) {
      const data = await request<{ user?: ApiUser; tokens?: ApiTokens; verified?: boolean }>(
        "/api/auth/otp/verify",
        { method: "POST", body: JSON.stringify(input), auth: false },
      );
      if (data.tokens) await tokenStore.save(data.tokens.accessToken, data.tokens.refreshToken);
      return data;
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
    async devices(): Promise<DeviceRow[]> {
      return request<{ items: DeviceRow[] }>("/api/auth/devices").then((r) => r.items);
    },
    async upsertDevice(input: { deviceId: string; name?: string; platform?: "ios" | "android" | "web" }) {
      return request<DeviceRow>("/api/auth/devices", { method: "PUT", body: JSON.stringify(input) });
    },
    async revokeDevice(deviceId: string) {
      return request<null>(`/api/auth/devices/${deviceId}`, { method: "DELETE" });
    },
  },

  config: {
    async app() {
      return request<{ minSupportedVersion: string | null; storeUrl: string | null }>(
        "/api/config/app",
        { auth: false },
      );
    },
  },

  directory: {
    async hospitals(): Promise<Hospital[]> {
      return request<{ items: Hospital[] }>("/api/directory/hospitals").then((r) => r.items);
    },
    async doctors(hospitalId?: string): Promise<Doctor[]> {
      const q = hospitalId ? `?hospitalId=${hospitalId}` : "";
      return request<{ items: Doctor[] }>(`/api/directory/doctors${q}`).then((r) => r.items);
    },
    async availability(doctorId: string, date: string): Promise<Availability> {
      return request<Availability>(`/api/directory/doctors/${doctorId}/availability?date=${date}`);
    },
  },

  scheduling: {
    async appointments(): Promise<Appointment[]> {
      return request<{ items: Appointment[] }>("/api/scheduling/appointments?limit=100").then((r) => r.items);
    },
    async bookAppointment(input: { doctorId: string; startsAt: string; reason?: string }) {
      return request<Appointment>("/api/scheduling/appointments", {
        method: "POST",
        body: JSON.stringify(input),
        headers: { "Idempotency-Key": `${Date.now()}-${Math.random().toString(36).slice(2)}` },
      });
    },
    async cancel(appointmentId: string) {
      return request<Appointment>(`/api/scheduling/appointments/${appointmentId}/cancel`, { method: "PATCH" });
    },
    async reschedule(appointmentId: string, startsAt: string) {
      return request<Appointment>(`/api/scheduling/appointments/${appointmentId}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({ startsAt }),
      });
    },
    async walkIn(doctorId: string) {
      return request<Token>("/api/scheduling/walkins", {
        method: "POST",
        body: JSON.stringify({ doctorId }),
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
  },

  clinical: {
    async me(): Promise<PatientRecord | null> {
      return request<PatientRecord | null>("/api/clinical/patients/me");
    },
    async createSelf(input: { fullName: string; email?: string; phone?: string }) {
      return request<PatientRecord>("/api/clinical/patients", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    async update(patientId: string, patch: Partial<PatientRecord>) {
      return request<PatientRecord>(`/api/clinical/patients/${patientId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    },
    async allergies(patientId: string) {
      return request<{ items: any[] }>(`/api/clinical/patients/${patientId}/allergies`).then((r) => r.items);
    },
    async conditions(patientId: string) {
      return request<{ items: any[] }>(`/api/clinical/patients/${patientId}/conditions`).then((r) => r.items);
    },
    async medications(patientId: string) {
      return request<{ items: any[] }>(`/api/clinical/patients/${patientId}/medications`).then((r) => r.items);
    },
    async labOrders(patientId: string): Promise<LabOrder[]> {
      return request<{ items: LabOrder[] }>(`/api/clinical/patients/${patientId}/lab-orders`).then((r) => r.items);
    },
    async prescriptions(patientId: string): Promise<Prescription[]> {
      return request<{ items: Prescription[] }>(`/api/clinical/patients/${patientId}/prescriptions`).then(
        (r) => r.items,
      );
    },
    async prescription(id: string): Promise<Prescription> {
      return request<Prescription>(`/api/clinical/prescriptions/${id}`);
    },
    async uploadDocument(input: { patientId: string; fileName: string; contentType: string; label?: string; dataBase64: string }) {
      return request<{ id: string; downloadUrl: string | null; publicUrl: string | null }>(
        "/api/clinical/documents",
        { method: "POST", body: JSON.stringify(input) },
      );
    },
    async documents(patientId: string) {
      return request<{ items: any[] }>(`/api/clinical/patients/${patientId}/documents`).then((r) => r.items);
    },
  },

  commerce: {
    async invoices(): Promise<Invoice[]> {
      return request<{ items: Invoice[] }>("/api/commerce/invoices?limit=100").then((r) => r.items);
    },
    async invoice(id: string): Promise<Invoice> {
      return request<Invoice>(`/api/commerce/invoices/${id}`);
    },
    async paymentIntent(invoiceId: string): Promise<Payment> {
      return request<Payment>("/api/commerce/payments/intent", {
        method: "POST",
        body: JSON.stringify({ invoiceId }),
      });
    },
    async capturePayment(paymentId: string): Promise<Payment> {
      return request<Payment>("/api/commerce/payments/mock-capture", {
        method: "POST",
        body: JSON.stringify({ paymentId }),
      });
    },
    async myPayments(): Promise<Payment[]> {
      return request<{ items: Payment[] }>("/api/commerce/payments/mine/list").then((r) => r.items);
    },
  },

  comms: {
    async notifications(): Promise<{ items: AppNotification[]; unreadCount: number; total: number }> {
      return request("/api/comms/notifications");
    },
    async markRead(id: string) {
      return request<AppNotification>(`/api/comms/notifications/${id}/read`, { method: "POST" });
    },
    async markAllRead() {
      return request<{ marked: number }>("/api/comms/notifications/read-all", { method: "POST" });
    },
    async preferences(): Promise<Record<string, string[]>> {
      return request<Record<string, string[]>>("/api/comms/preferences");
    },
    async savePreferences(categories: Record<string, string[]>) {
      return request<Record<string, string[]>>("/api/comms/preferences", {
        method: "PUT",
        body: JSON.stringify({ categories }),
      });
    },
    async registerPush(input: { token: string; platform: "ios" | "android" | "web"; deviceId?: string }) {
      return request<{ registered: boolean; activeTokens: number }>("/api/comms/push/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
  },

  ai: {
    async chat(message: string, history: { role: "user" | "assistant"; content: string }[] = []) {
      return request<{ content: string; reasoning: string; finishReason: string; model: string }>(
        "/api/ai/chat",
        { method: "POST", body: JSON.stringify({ message, messages: history.slice(-10) }) },
      );
    },
    async memoryList(limit = 30) {
      return request<{ items: any[] }>(`/api/ai/memory?limit=${limit}`).then((r) => r.items);
    },
    async memoryErase() {
      return request<{ deleted: number }>("/api/ai/memory", { method: "DELETE" });
    },
  },
};
