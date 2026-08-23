import { useEffect, useState } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PanelTitle } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

function useFetch<T>(fn: () => Promise<T>): { data: T | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn()
      .then((d) => alive && setData(d))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tick]);
  return { data, loading, reload: () => setTick((t) => t + 1) };
}

function Tray({
  title,
  action,
  children
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card className="gap-0 bg-muted/50 p-1 ring-0 shadow-sm">
      <div className="flex items-center justify-between px-3 py-2">
        <PanelTitle title={title} />
        {action}
      </div>
      <div className="rounded-xl bg-card p-4">{children}</div>
    </Card>
  );
}

export function Notifications(): React.JSX.Element {
  const { data, loading, reload } = useFetch(() => api.comms.notifications());
  if (loading)
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 bg-surface-muted" />
        <Skeleton className="h-16 bg-surface-muted" />
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Notifications</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void api.comms.markAllRead().then(reload)}
        >
          Mark all read
        </Button>
      </div>
      <Tray title="Inbox">
        <div className="space-y-2">
          {(data?.items ?? []).length === 0 && (
            <p className="text-sm font-[350] text-muted-foreground">Nothing here yet.</p>
          )}
          {(data?.items ?? []).map((n) => (
            <div
              key={n.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{n.subject}</p>
                <p className="truncate text-xs font-[350] text-muted-foreground">{n.body}</p>
              </div>
              {!n.readAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void api.comms.markRead(n.id).then(reload)}
                >
                  Read
                </Button>
              )}
            </div>
          ))}
        </div>
      </Tray>
    </div>
  );
}

export function Copilot(): React.JSX.Element {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hi! Ask me anything about your workday." }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  function send(): void {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const history = messages.slice(-10);
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setBusy(true);
    api.ai
      .chat(text, history)
      .then((res) => {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: res.content || "(no answer)" };
          return copy;
        });
      })
      .catch((e) => {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Sorry - " + (e instanceof Error ? e.message : "unavailable")
          };
          return copy;
        });
      })
      .finally(() => setBusy(false));
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col space-y-4">
      <h1 className="text-2xl font-medium tracking-tight">Copilot</h1>
      <Card className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-xl bg-card p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[75%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[75%] rounded-lg border border-border bg-background px-3 py-2 text-sm font-[350]"
              }
            >
              {m.content || "..."}
            </div>
          </div>
        ))}
        {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </Card>
      <div className="flex gap-2">
        <Input
          className="h-9 bg-muted/40 font-[350] shadow-none"
          value={input}
          placeholder="Ask anything..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button size="icon" disabled={busy || !input.trim()} onClick={send} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function Payments(): React.JSX.Element {
  const { data, loading, reload } = useFetch(() => api.commerce.invoices());
  const [paying, setPaying] = useState<string | null>(null);

  function pay(invoiceId: string): void {
    setPaying(invoiceId);
    api.commerce
      .paymentIntent(invoiceId)
      .then((p) => api.commerce.capturePayment(p.id))
      .then(reload)
      .catch(() => {})
      .finally(() => setPaying(null));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-medium tracking-tight">Bills & payments</h1>
      {loading ? (
        <Skeleton className="h-24 bg-surface-muted" />
      ) : (
        <Tray title="Invoices">
          <div className="space-y-2">
            {(data ?? []).length === 0 && (
              <p className="text-sm font-[350] text-muted-foreground">No invoices yet.</p>
            )}
            {(data ?? []).map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">{inv.invoiceNo}</span>
                  <span className="font-mono text-sm">
                    {inv.total} {inv.currency}
                  </span>
                  <StatusBadge status={inv.status} />
                </div>
                {inv.status === "UNPAID" && (
                  <Button
                    variant="cta"
                    size="sm"
                    disabled={paying === inv.id}
                    onClick={() => pay(inv.id)}
                  >
                    {paying === inv.id ? <Loader2 className="size-3 animate-spin" /> : null}
                    Pay
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Tray>
      )}
    </div>
  );
}

export function Records(): React.JSX.Element {
  const me = useFetch(() => api.clinical.me());
  const patientId = me.data?.id ?? null;
  const allergies = useFetch(() =>
    patientId ? api.clinical.allergies(patientId) : Promise.resolve([])
  );
  const conditions = useFetch(() =>
    patientId ? api.clinical.conditions(patientId) : Promise.resolve([])
  );
  const medications = useFetch(() =>
    patientId ? api.clinical.medications(patientId) : Promise.resolve([])
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-medium tracking-tight">Records</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <Tray title="Allergies">
          {(allergies.data ?? []).length === 0 ? (
            <p className="text-sm font-[350] text-muted-foreground">None recorded.</p>
          ) : (
            (allergies.data ?? []).map((a) => (
              <div key={a.id} className="mb-1.5 text-sm font-[350]">
                <span className="font-medium">{a.substance}</span>{" "}
                <StatusBadge status={a.severity ?? "Pending"} />
              </div>
            ))
          )}
        </Tray>
        <Tray title="Conditions">
          {(conditions.data ?? []).length === 0 ? (
            <p className="text-sm font-[350] text-muted-foreground">None recorded.</p>
          ) : (
            (conditions.data ?? []).map((c) => (
              <div key={c.id} className="mb-1.5 text-sm font-[350]">
                <span className="font-medium">{c.name}</span>
                {c.since ? <span className="text-muted-foreground"> · since {c.since}</span> : null}
              </div>
            ))
          )}
        </Tray>
        <Tray title="Medications">
          {(medications.data ?? []).length === 0 ? (
            <p className="text-sm font-[350] text-muted-foreground">None active.</p>
          ) : (
            (medications.data ?? []).map((m: { id?: string; drug?: string; dose?: string; frequency?: string }) => (
              <div key={m.id} className="mb-1.5 text-sm font-[350]">
                <span className="font-medium">{m.drug ?? ""}</span>{" "}
                <span className="text-muted-foreground">
                  {m.dose ?? ""} · {m.frequency ?? ""}
                </span>
              </div>
            ))
          )}
        </Tray>
      </div>
    </div>
  );
}

export function Prescriptions(): React.JSX.Element {
  const me = useFetch(() => api.clinical.me());
  const patientId = me.data?.id ?? null;
  const { data, loading } = useFetch(() =>
    patientId ? api.clinical.prescriptions(patientId) : Promise.resolve([])
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-medium tracking-tight">Prescriptions</h1>
      <Tray title="Signed prescriptions">
        {loading ? (
          <Skeleton className="h-16 bg-surface-muted" />
        ) : (data ?? []).length === 0 ? (
          <p className="text-sm font-[350] text-muted-foreground">Nothing signed yet.</p>
        ) : (
          (data ?? []).map((rx) => (
            <div
              key={rx.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-medium">{rx.doctorSnapshot?.name ?? "Doctor"}</p>
                <p className="text-[11px] font-[350] text-muted-foreground">
                  {rx.signedAt?.slice(0, 10)} · {rx.items.length} medicines
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={rx.status} />
                {rx.pdfUrl && (
                  <Button variant="outline" size="sm" onClick={() => window.open(rx.pdfUrl!, "_blank")}>
                    Open PDF
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </Tray>
    </div>
  );
}

export function AdminUsers(): React.JSX.Element {
  const { data, loading, reload } = useFetch(() => api.admin.users());
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Users & roles</h1>
        <Button variant="outline" size="sm" onClick={reload}>
          Reload
        </Button>
      </div>
      <Tray title="All users">
        {loading ? (
          <Skeleton className="h-16 bg-surface-muted" />
        ) : (
          <div className="space-y-1.5">
            {(data?.items ?? []).map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{u.fullName}</p>
                  <p className="text-[11px] font-[350] text-muted-foreground">
                    {u.email ?? u.phone ?? "-"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(u.roles ?? []).map((r) => (
                    <StatusBadge key={r.role + r.hospitalId} status={r.role} />
                  ))}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Deactivate ${u.fullName}`}
                    onClick={() =>
                      void api.admin.setUserStatus(u.id, !u.isActive).then(reload)
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Tray>
    </div>
  );
}

export function AdminAudit(): React.JSX.Element {
  const { data, loading } = useFetch(() => api.admin.audit({ limit: 100 }));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-medium tracking-tight">Audit log</h1>
      <Tray title="Recent entries">
        {loading ? (
          <Skeleton className="h-24 bg-surface-muted" />
        ) : (
          <div className="space-y-1 font-mono text-xs">
            {(data?.items ?? []).map((a) => (
              <div key={a.id} className="flex gap-4 border-b border-border-subtle py-1.5">
                <span className="w-40 shrink-0">{a.timestamp?.slice(0, 19).replace("T", " ")}</span>
                <span className="w-56 shrink-0 font-medium">{a.action}</span>
                <span className="truncate text-muted-foreground">{a.resource}</span>
              </div>
            ))}
          </div>
        )}
      </Tray>
    </div>
  );
}

export function AdminEvents(): React.JSX.Element {
  const { data, loading, reload } = useFetch(() => api.admin.events());
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Live events</h1>
        <Button variant="outline" size="sm" onClick={reload}>
          Refresh
        </Button>
      </div>
      <Tray title="Event bus (recent 100)">
        {loading ? (
          <Skeleton className="h-24 bg-surface-muted" />
        ) : (
          <div className="space-y-1 font-mono text-xs">
            {(data?.events ?? []).map((e) => (
              <div key={e.messageId} className="flex gap-4 border-b border-border-subtle py-1.5">
                <span className="w-40 shrink-0">{String((e as { occurredAt?: string }).occurredAt ?? "").slice(11, 19)}</span>
                <span className="w-64 shrink-0 font-medium">{e.topic}</span>
                <span className="truncate text-muted-foreground">
                  {JSON.stringify((e as { payload?: Record<string, unknown> }).payload ?? {}).slice(0, 90)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Tray>
    </div>
  );
}

export function Trash(): React.JSX.Element {
  return <Trash2 />;
}


