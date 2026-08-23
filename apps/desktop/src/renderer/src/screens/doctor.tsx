import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { api, type Doctor, type Token } from "@/lib/api";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { PanelTitle } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

const dateToday = (): string => new Date().toISOString().slice(0, 10);

type ConsultationState = {
  consultationId: string;
  tokenId: string;
  patientId: string;
  patientName: string;
};

export function Doctor(): React.JSX.Element {
  const { user } = useSession();
  const [myDoctorId, setMyDoctorId] = useState<string | null>(null);
  const [queue, setQueue] = useState<Token[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ConsultationState | null>(null);

  useEffect(() => {
    api.directory
      .doctors()
      .then((docs: Doctor[]) => {
        const mine = docs.find((d) => d.userId === user?.id) ?? docs[0];
        if (mine) setMyDoctorId(mine.id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load doctors"));
  }, [user?.id]);

  const load = useCallback(async () => {
    if (!myDoctorId) return;
    try {
      setError(null);
      const data = await api.scheduling.queue(myDoctorId, dateToday());
      const full = await Promise.all(
        data.nowServing.map((n) => api.scheduling.token(n.tokenId).catch(() => null))
      );
      const fullTokens = full.filter((t): t is Token => !!t);
      setQueue([...fullTokens, ...data.waiting]);
      const inRoom = fullTokens.find((t) => t.status === "IN_CONSULTATION");
      if (inRoom) {
        setActive((prev) =>
          prev?.tokenId === inRoom.id
            ? prev
            : {
                consultationId: inRoom.consultationId,
                tokenId: inRoom.id,
                patientId: inRoom.patientId,
                patientName: inRoom.patientName
              }
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the queue");
    }
  }, [myDoctorId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function act(token: Token, action: "call" | "start" | "complete" | "skip"): Promise<void> {
    setBusyId(token.id);
    try {
      await api.scheduling.tokenAction(token.id, action);
      if (action === "start") {
        setActive({
          consultationId: token.consultationId,
          tokenId: token.id,
          patientId: token.patientId,
          patientName: token.patientName
        });
      }
      if (action === "complete") setActive(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setBusyId(null);
    }
  }

  const called = useMemo(() => queue.filter((t) => t.status === "CALLED"), [queue]);
  const waiting = useMemo(() => queue.filter((t) => t.status === "WAITING"), [queue]);
  const inRoom = useMemo(() => queue.find((t) => t.status === "IN_CONSULTATION"), [queue]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-medium tracking-tight">My clinic</h1>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          <p className="text-xs font-[350] text-destructive">{error}</p>
        </div>
      )}

      {active && <ConsultationPanel state={active} onCompleted={() => { setActive(null); void load(); }} />}

      <TrayList
        title="Called - ready to start"
        loading={false}
        empty="Call a patient from reception, then start here."
        rows={called.map((t) => ({
          id: t.id,
          token: t.tokenNumber,
          name: t.patientName,
          priority: t.priority,
          status: t.status,
          actions: (
            <Button size="sm" disabled={busyId === t.id} onClick={() => void act(t, "start")}>
              {busyId === t.id ? <Loader2 className="size-3 animate-spin" /> : null}
              Start
            </Button>
          )
        }))}
      />

      <TrayList
        title="In consultation"
        loading={false}
        empty="No active consultation."
        rows={
          inRoom
            ? [
                {
                  id: inRoom.id,
                  token: inRoom.tokenNumber,
                  name: inRoom.patientName,
                  priority: inRoom.priority,
                  status: inRoom.status,
                  actions: (
                    <Button
                      size="sm"
                      variant="success"
                      disabled={busyId === inRoom.id}
                      onClick={() => void act(inRoom, "complete")}
                    >
                      {busyId === inRoom.id ? <Loader2 className="size-3 animate-spin" /> : null}
                      Complete
                    </Button>
                  )
                }
              ]
            : []
        }
      />

      <TrayList
        title="Waiting"
        loading={false}
        empty="Nobody waiting."
        rows={waiting.map((t) => ({
          id: t.id,
          token: t.tokenNumber,
          name: t.patientName,
          priority: t.priority,
          status: t.status,
          actions: (
            <Button variant="ghost" size="sm" onClick={() => void act(t, "skip")}>
              Skip
            </Button>
          )
        }))}
      />
    </div>
  );
}

function TrayList({
  title,
  rows,
  loading,
  empty
}: {
  title: string;
  rows: {
    id: string;
    token: number;
    name: string;
    priority: string;
    status: string;
    actions: React.ReactNode;
  }[];
  loading: boolean;
  empty: string;
}): React.JSX.Element {
  return (
    <Card className="gap-0 bg-muted/50 p-1 ring-0 shadow-sm">
      <div className="flex items-center justify-between px-3 py-2">
        <PanelTitle title={title} />
      </div>
      <div className="overflow-hidden rounded-xl bg-card py-2">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-40 bg-surface-muted" />
            <Skeleton className="h-4 w-56 bg-surface-muted" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm font-[350] text-muted-foreground">{empty}</p>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between border-b border-border-subtle px-4 py-3 last:border-b-0 hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">#{r.token}</span>
                <span className="text-sm font-medium">{r.name}</span>
                <StatusBadge status={r.priority} />
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                {r.actions}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function ConsultationPanel({
  state,
  onCompleted
}: {
  state: ConsultationState;
  onCompleted: () => void;
}): React.JSX.Element {
  const { consultationId, patientId, patientName } = state;
  const [complaint, setComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [plan, setPlan] = useState("");
  const [savingContent, setSavingContent] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [rxOpen, setRxOpen] = useState(false);
  const [drug, setDrug] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("1-0-1");
  const [durationDays, setDurationDays] = useState(5);
  const [items, setItems] = useState<
    { drug: string; dose: string; frequency: string; durationDays: number }[]
  >([]);
  const [signing, setSigning] = useState(false);
  const [rxId, setRxId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<{
    allergies: { id: string; substance?: string; severity?: string }[];
    conditions: { id: string; name?: string }[];
    medications: { id: string; drug?: string; dose?: string }[];
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [a, c, m] = await Promise.all([
          api.clinical.allergies(patientId),
          api.clinical.conditions(patientId),
          api.clinical.medications(patientId)
        ]);
        if (alive) setSummary({ allergies: a, conditions: c, medications: m });
      } catch {
        if (alive) setSummary(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [patientId]);

  async function saveContent(): Promise<void> {
    setSavingContent(true);
    try {
      await api.clinical.saveContent(consultationId, { complaint, diagnosis, plan });
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingContent(false);
    }
  }

  async function createAndSign(): Promise<void> {
    if (items.length === 0) return setError("Add at least one medicine.");
    setSigning(true);
    setError(null);
    try {
      const rx = await api.clinical.createPrescription(consultationId, { items });
      const signed = await api.clinical.signPrescription(rx.id);
      setRxId(signed.id);
      setPdfUrl(signed.pdfUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign failed");
    } finally {
      setSigning(false);
    }
  }

  return (
    <Card className="rounded-lg border-border shadow-none">
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
              In consultation
            </p>
            <p className="text-lg font-[500]">{patientName}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onCompleted}>
            Mark completed
          </Button>
        </div>

        {summary && summary.allergies.length > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
            <p className="text-xs font-[350] text-destructive">
              Allergies: {summary.allergies.map((a) => `${a.substance} (${a.severity})`).join(", ")}
            </p>
          </div>
        )}

        {error && <p className="text-xs font-[350] text-destructive">{error}</p>}

        <div className="grid gap-3 lg:grid-cols-3">
          <Field label="Complaint" value={complaint} onChange={setComplaint} placeholder="Chief complaint" />
          <Field label="Diagnosis" value={diagnosis} onChange={setDiagnosis} placeholder="Assessment / ICD" />
          <Field label="Plan" value={plan} onChange={setPlan} placeholder="Investigations, advice" />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={savingContent} onClick={() => void saveContent()}>
            {savingContent ? <Loader2 className="size-3 animate-spin" /> : null}
            Save notes
          </Button>
          {savedAt && (
            <span className="text-[11px] font-[350] text-muted-foreground">Saved at {savedAt}</span>
          )}
        </div>

        <div className="border-t border-border-subtle pt-4">
          <div className="mb-2 flex items-center justify-between">
            <PanelTitle title="Prescription" />
            <Button variant="outline" size="sm" onClick={() => setRxOpen(true)}>
              <Plus className="size-3.5" />
              Add medicine
            </Button>
          </div>

          {items.length === 0 && !rxId && (
            <p className="text-sm font-[350] text-muted-foreground">
              Add medicines, then sign to produce the immutable PDF.
            </p>
          )}

          {items.length > 0 && !rxId && (
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="text-sm font-[350]">
                  <span className="font-medium">{it.drug}</span>{" "}
                  <span className="text-muted-foreground">
                    {it.dose} · {it.frequency} · {it.durationDays}d
                  </span>
                </div>
              ))}
              <Button size="sm" variant="success" disabled={signing} onClick={() => void createAndSign()}>
                {signing ? <Loader2 className="size-3 animate-spin" /> : null}
                {signing ? "Signing..." : "Sign prescription"}
              </Button>
            </div>
          )}

          {rxId && (
            <div className="rounded-md border border-success-border bg-success-background px-3 py-2">
              <p className="text-xs font-[350] text-success">
                Signed. The PDF is on the patient's phone and in their records.
              </p>
              {pdfUrl && (
                <button
                  onClick={() => void window.open(pdfUrl, "_blank")}
                  className="mt-1 text-[11px] font-[450] text-success underline"
                >
                  Open PDF
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={rxOpen} onOpenChange={setRxOpen}>
        <DialogContent className="rounded-xl border-border bg-background shadow-dialog sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add medicine</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Drug" value={drug} onChange={setDrug} placeholder="Paracetamol 500mg Tablet" />
            <Field label="Dose" value={dose} onChange={setDose} placeholder="500mg" />
            <Field label="Frequency" value={frequency} onChange={setFrequency} placeholder="1-0-1" />
            <Field
              label="Duration (days)"
              value={String(durationDays)}
              onChange={(v) => setDurationDays(Number(v) || 1)}
              placeholder="5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRxOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!drug.trim()) return;
                setItems((xs) => [...xs, { drug: drug.trim(), dose, frequency, durationDays }]);
                setDrug("");
                setDose("");
                setFrequency("1-0-1");
                setDurationDays(5);
                setRxOpen(false);
              }}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      <Input
        className="h-9 bg-muted/40 font-[350] shadow-none"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

