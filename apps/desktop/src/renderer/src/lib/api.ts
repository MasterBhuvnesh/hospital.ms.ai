export const API_URL =
  import.meta.env.VITE_API_BASE ?? "https://backend-demo-hms.onrender.com";

export const ROLES = [
  "PATIENT",
  "DOCTOR",
  "RECEPTIONIST",
  "PHARMACIST",
  "LAB_TECH",
  "HOSPITAL_ADMIN",
  "PLATFORM_ADMIN",
] as const;

export type Role = (typeof ROLES)[number];
export const ADMIN_ROLES: Role[] = ["HOSPITAL_ADMIN", "PLATFORM_ADMIN"];

/* ---------------- token store (localStorage) ---------------- */

const K_ACCESS = "atelier_access";
const K_REFRESH = "atelier_refresh";
const K_USER = "atelier_user";

function lsGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function lsRemove(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

export const tokenStore = {
  getAccess: () => lsGet(K_ACCESS),
  getRefresh: () => lsGet(K_REFRESH),
  save(access: string, refresh: string) {
    lsSet(K_ACCESS, access);
    lsSet(K_REFRESH, refresh);
  },
  clear() {
    lsRemove(K_ACCESS);
    lsRemove(K_REFRESH);
    lsRemove(K_USER);
  },
  getUser(): ApiUser | null {
    const raw = lsGet(K_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ApiUser;
    } catch {
      return null;
    }
  },
  setUser(user: ApiUser | null) {
    if (user) lsSet(K_USER, JSON.stringify(user));
    else lsRemove(K_USER);
  },
};

/* ---------------- types ---------------- */

export type ApiUser = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive?: boolean;
  roles: { role: string; hospitalId: string | null; isPrimary?: boolean }[];
};

export type ApiTokens = { accessToken: string; refreshToken: string };

export type Hospital = { id: string; name: string; city: string };

export type Doctor = {
  id: string;
  userId?: string | null;
  fullName: string;
  specializations: string[];
  qualification?: string | null;
  experienceYears?: number;
  registrationNumber?: string;
  hospitalIds: string[];
  feeConfig: { version: number; amount: number; currency: string };
};

export type Availability = {
  doctorId: string;
  date: string;
  onLeave: boolean;
  checkedIn?: boolean;
  slots: { time: string; available: boolean; reason?: string }[];
};

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
  patientId: string;
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

export type LabResultRow = {
  parameter: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: string;
};

export type LabOrder = {
  id: string;
  consultationId: string;
  tests: { code: string; name: string }[];
  priority: "ROUTINE" | "URGENT";
  status: "ORDERED" | "COLLECTED" | "ENTERED" | "RELEASED";
  results: LabResultRow[];
  releasedAt: string | null;
  createdAt: string;
};

export type ClinicalItem = {
  id: string;
  name?: string;
  substance?: string;
  code?: string;
  severity?: string;
  status?: string;
  dose?: string;
  frequency?: string;
  since?: string;
  notedAt?: string;
  [key: string]: unknown;
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
  meta?: Record<string, unknown>;
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

export type PatientDocument = {
  id: string;
  patientId: string;
  uploadedBy: string;
  label: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  publicUrl: string | null;
  createdAt: string;
};

export type AdminUser = ApiUser & { isActive: boolean };

export type AuditRow = {
  id?: string;
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  hospitalId?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  timestamp: string;
  correlationId?: string | null;
};

export type EventEnvelope = {
  messageId: string;
  correlationId: string | null;
  causationId?: string | null;
  occurredAt: string;
  topic: string;
  hospitalId: string | null;
  actorId: string | null;
  payload: Record<string, unknown>;
};

export type BreakGlassGrant = {
  id: string;
  grantedTo: string;
  grantedRole: string;
  patientId: string;
  reason: string;
  expiresAt: string;
};

export type PatientSummary = {
  patient: {
    id: string;
    fullName: string;
    phone: string | null;
    registrations?: unknown;
  };
  visitCount: number;
  completedVisits: number;
  noShows: number;
  invoiceTotal: number;
  outstanding: number;
  clinicalNote: string;
};

export type AppConfig = {
  minSupportedVersion: string | null;
  storeUrl: string | null;
};

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

type Envelope<T> = { status: string; code: string; data: T };

const isOk = (s: number) => s >= 200 && s < 300;

async function raw<T>(
  path: string,
  init?: RequestInit & { auth?: boolean },
): Promise<{
  status: number;
  body: Partial<Envelope<T>> & { error?: { code: string; message: string } };
}> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (init?.auth !== false) {
    const access = tokenStore.getAccess();
    if (access) headers.Authorization = `Bearer ${access}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      "NETWORK",
      "Cannot reach the server - it may be waking up from a cold start. Give it about a minute, then retry.",
      undefined,
    );
  }
  const body = (await res.json().catch(() => ({}))) as Partial<Envelope<T>> & {
    error?: { code: string; message: string };
  };
  return { status: res.status, body };
}

async function request<T>(
  path: string,
  init?: RequestInit & { auth?: boolean },
  retried = false,
): Promise<T> {
  const { status, body } = await raw<T>(path, init);
  if (status === 401 && !retried && init?.auth !== false) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, init, true);
    onUnauthorized?.();
  }
  if (!isOk(status)) {
    throw new ApiError(
      body?.error?.code ?? "ERROR",
      body?.error?.message ?? `Request failed (${status})`,
      status,
    );
  }
  return body.data as T;
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) return false;
      const { status, body } = await raw<{ tokens: ApiTokens }>("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
        auth: false,
      });
      if (status !== 200 || !body.data?.tokens) return false;
      tokenStore.save(body.data.tokens.accessToken, body.data.tokens.refreshToken);
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
      const data = await request<{ user: ApiUser; tokens: ApiTokens }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
        auth: false,
      });
      tokenStore.save(data.tokens.accessToken, data.tokens.refreshToken);
      tokenStore.setUser(data.user);
      return data.user;
    },
    async register(input: { fullName: string; email: string; password: string }) {
      const data = await request<{ user: ApiUser; tokens: ApiTokens }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
        auth: false,
      });
      tokenStore.save(data.tokens.accessToken, data.tokens.refreshToken);
      tokenStore.setUser(data.user);
      return data.user;
    },
    async requestOtp(destination: string, purpose: "LOGIN" | "RESET_PASSWORD") {
      return request<{ sent: true; destinationType: string; devCode?: string }>(
        "/api/auth/otp/request",
        { method: "POST", body: JSON.stringify({ destination, purpose }), auth: false },
      );
    },
    async verifyOtp(input: {
      destination: string;
      code: string;
      purpose: "LOGIN" | "RESET_PASSWORD";
      newPassword?: string;
    }) {
      const data = await request<{ user?: ApiUser; tokens?: ApiTokens; verified?: boolean }>(
        "/api/auth/otp/verify",
        { method: "POST", body: JSON.stringify(input), auth: false },
      );
      if (data.tokens) {
        tokenStore.save(data.tokens.accessToken, data.tokens.refreshToken);
        if (data.user) tokenStore.setUser(data.user);
      }
      return data;
    },
    async me() {
      const data = await request<{ user: ApiUser; hospitals?: Hospital[] }>("/api/auth/me");
      tokenStore.setUser(data.user);
      return data.user;
    },
    async logout() {
      // Clear local session first so the UI can navigate immediately;
      // the server-side revoke is best-effort (works even when offline).
      const refreshToken = tokenStore.getRefresh();
      tokenStore.clear();
      try {
        await raw("/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
          auth: false,
        });
      } catch {
        /* server revoke failed - local session is already gone */
      }
    },
    async devices(): Promise<DeviceRow[]> {
      return request<{ items: DeviceRow[] }>("/api/auth/devices").then((r) => r.items);
    },
    async revokeDevice(deviceId: string) {
      return request<null>(`/api/auth/devices/${deviceId}`, { method: "DELETE" });
    },
  },

  config: {
    async app(): Promise<AppConfig> {
      return request<AppConfig>("/api/config/app", { auth: false });
    },
  },

  directory: {
    async hospitals(): Promise<Hospital[]> {
      return request<{ items: Hospital[] }>("/api/directory/hospitals").then((r) => r.items);
    },
    async doctors(hospitalId?: string): Promise<Doctor[]> {
      const q = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : "";
      return request<{ items: Doctor[] }>(`/api/directory/doctors${q}`).then((r) => r.items);
    },
    async availability(doctorId: string, date: string): Promise<Availability> {
      return request<Availability>(`/api/directory/doctors/${doctorId}/availability?date=${date}`);
    },
  },

  scheduling: {
    async appointments(): Promise<Appointment[]> {
      return request<{ items: Appointment[] }>("/api/scheduling/appointments?limit=100").then(
        (r) => r.items,
      );
    },
    async bookAppointment(input: { doctorId: string; startsAt: string; reason?: string }) {
      return request<Appointment>("/api/scheduling/appointments", {
        method: "POST",
        body: JSON.stringify(input),
        headers: { "Idempotency-Key": `${Date.now()}-${Math.random().toString(36).slice(2)}` },
      });
    },
    async cancel(appointmentId: string) {
      return request<Appointment>(`/api/scheduling/appointments/${appointmentId}/cancel`, {
        method: "PATCH",
      });
    },
    async reschedule(appointmentId: string, startsAt: string) {
      return request<Appointment>(`/api/scheduling/appointments/${appointmentId}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({ startsAt }),
      });
    },
    async walkIn(input: {
      doctorId: string;
      patientId?: string;
      fullName?: string;
      phone?: string;
      priority?: "EMERGENCY" | "SENIOR_CITIZEN" | "WOMAN_CHILD" | "NORMAL";
    }) {
      return request<Token>("/api/scheduling/walkins", {
        method: "POST",
        body: JSON.stringify(input)
      });
    },
    async queue(
      doctorId: string,
      date: string
    ): Promise<{
      doctorId: string;
      doctorName: string;
      date: string;
      nowServing: { tokenId: string; tokenNumber: number; status: string }[];
      waiting: (Token & { position: number; etaMinutes: number })[];
      completedCount: number;
      pendingCount: number;
    }> {
      return request(`/api/scheduling/queue?doctorId=${doctorId}&date=${date}`);
    },
    async tokenAction(
      tokenId: string,
      action: "call" | "start" | "skip" | "recall" | "complete" | "no-show"
    ): Promise<Token> {
      return request<Token>(`/api/scheduling/tokens/${tokenId}/${action}`, { method: "POST" });
    },
    async mintToken(appointmentId: string) {
      return request<Token>("/api/scheduling/tokens", {
        method: "POST",
        body: JSON.stringify({ appointmentId }),
      });
    },
    async token(tokenId: string): Promise<Token> {
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
    async allergies(patientId: string): Promise<ClinicalItem[]> {
      return request<{ items: ClinicalItem[] }>(`/api/clinical/patients/${patientId}/allergies`).then(
        (r) => r.items,
      );
    },
    async conditions(patientId: string): Promise<ClinicalItem[]> {
      return request<{ items: ClinicalItem[] }>(`/api/clinical/patients/${patientId}/conditions`).then(
        (r) => r.items,
      );
    },
    async medications(patientId: string): Promise<ClinicalItem[]> {
      return request<{ items: ClinicalItem[] }>(`/api/clinical/patients/${patientId}/medications`).then(
        (r) => r.items,
      );
    },
    async labOrders(patientId: string): Promise<LabOrder[]> {
      return request<{ items: LabOrder[] }>(`/api/clinical/patients/${patientId}/lab-orders`).then(
        (r) => r.items,
      );
    },
    async prescriptions(patientId: string): Promise<Prescription[]> {
      return request<{ items: Prescription[] }>(
        `/api/clinical/patients/${patientId}/prescriptions`,
      ).then((r) => r.items);
    },
    async prescription(id: string): Promise<Prescription> {
      return request<Prescription>(`/api/clinical/prescriptions/${id}`);
    },
    async uploadDocument(input: {
      patientId: string;
      fileName: string;
      contentType: string;
      label?: string;
      dataBase64: string;
    }) {
      return request<{ id: string; downloadUrl: string | null; publicUrl: string | null }>(
        "/api/clinical/documents",
        { method: "POST", body: JSON.stringify(input) },
      );
    },
    async documents(patientId: string): Promise<PatientDocument[]> {
      return request<{ items: PatientDocument[] }>(`/api/clinical/patients/${patientId}/documents`).then(
        (r) => r.items,
      );
    },
    async document(id: string): Promise<PatientDocument & { downloadUrl: string | null }> {
      return request(`/api/clinical/documents/${id}`);
    },
    async saveContent(
      consultationId: string,
      patch: { complaint?: string; diagnosis?: string; plan?: string }
    ): Promise<unknown> {
      return request(`/api/clinical/consultations/${consultationId}/content`, {
        method: "PUT",
        body: JSON.stringify(patch)
      });
    },
    async createPrescription(
      consultationId: string,
      body: {
        items: {
          drug: string;
          dose: string;
          frequency: string;
          durationDays: number;
          instructions?: string;
        }[];
        notes?: string;
      }
    ): Promise<{ id: string }> {
      return request(`/api/clinical/consultations/${consultationId}/prescriptions`, {
        method: "POST",
        body: JSON.stringify(body)
      });
    },
    async signPrescription(id: string): Promise<{ id: string; pdfUrl: string | null }> {
      return request<{ id: string; pdfUrl: string | null }>(
        `/api/clinical/prescriptions/${id}/sign`,
        { method: "POST" }
      );
    },
    async deleteDocument(id: string) {
      return request<null>(`/api/clinical/documents/${id}`, { method: "DELETE" });
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
    async notifications(): Promise<{
      items: AppNotification[];
      unreadCount: number;
      total: number;
    }> {
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
  },

  ai: {
    async chat(message: string, history: { role: "user" | "assistant"; content: string }[] = []) {
      return request<{ content: string; reasoning: string; finishReason: string; model: string }>(
        "/api/ai/chat",
        { method: "POST", body: JSON.stringify({ message, messages: history.slice(-10) }) },
      );
    },
    async memoryList(limit = 30) {
      return request<{ items: ClinicalItem[] }>(`/api/ai/memory?limit=${limit}`).then((r) => r.items);
    },
    async memoryErase() {
      return request<{ deleted: number }>("/api/ai/memory", { method: "DELETE" });
    },
  },

  admin: {
    async users(params: { q?: string; limit?: number } = {}): Promise<{
      items: AdminUser[];
      total: number;
    }> {
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.limit) qs.set("limit", String(params.limit));
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request(`/api/admin/users${suffix}`);
    },
    async setUserStatus(id: string, isActive: boolean): Promise<AdminUser> {
      return request(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    },
    async grantRole(
      id: string,
      input: { role: Role; hospitalId?: string; isPrimary?: boolean },
    ): Promise<AdminUser> {
      return request(`/api/admin/users/${id}/roles`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    async audit(params: { action?: string; actorId?: string; from?: string; limit?: number } = {}): Promise<{
      items: AuditRow[];
      total: number;
    }> {
      const qs = new URLSearchParams();
      if (params.action) qs.set("action", params.action);
      if (params.actorId) qs.set("actorId", params.actorId);
      if (params.from) qs.set("from", params.from);
      qs.set("limit", String(params.limit ?? 100));
      return request(`/api/admin/audit?${qs.toString()}`);
    },
    async events(): Promise<{ events: EventEnvelope[] }> {
      return request("/api/admin/events");
    },
    async createBreakGlass(input: { patientId: string; reason: string; ttlMinutes?: number }): Promise<{
      grant: BreakGlassGrant;
      note: string;
    }> {
      return request("/api/admin/break-glass", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    async activeBreakGlass(): Promise<{ active: BreakGlassGrant[] }> {
      return request("/api/admin/break-glass");
    },
    async patientSummary(id: string): Promise<PatientSummary> {
      return request(`/api/admin/patients/${id}/summary`);
    },
  },
};

