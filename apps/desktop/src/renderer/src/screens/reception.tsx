import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { api, type Doctor, type Token } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { PanelTitle, MoreButton } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";

const dateToday = (): string => new Date().toISOString().slice(0, 10);

export function Reception(): React.JSX.Element {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [queue, setQueue] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walkinOpen, setWalkinOpen] = useState(false);

  useEffect(() => {
    api.directory
      .doctors()
      .then((docs) => {
        setDoctors(docs);
        if (docs.length > 0) setDoctorId(docs[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load doctors"));
  }, []);

  const load = useCallback(async () => {
    if (!doctorId) return;
    try {
      setError(null);
      const data = await api.scheduling.queue(doctorId, dateToday());
      setQueue(data.waiting);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the queue");
    }
  }, [doctorId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function act(token: Token, action: string): Promise<void> {
    setBusyId(token.id);
    try {
      await api.scheduling.tokenAction(token.id, action as "call" | "skip" | "recall" | "no-show");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setBusyId(null);
    }
  }

  const stats = useMemo(() => {
    const waiting = queue.filter((t) => t.status === "WAITING").length;
    const called = queue.filter((t) => t.status === "CALLED").length;
    const inRoom = queue.filter((t) => t.status === "IN_CONSULTATION").length;
    return { waiting, called, inRoom };
  }, [queue]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight">Reception desk</h1>
        <Button size="lg" onClick={() => setWalkinOpen(true)}>
          <UserPlus className="size-4" data-icon="inline-start" />
          Walk-in registration
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          <p className="text-xs font-[350] text-destructive">{error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Waiting", value: stats.waiting },
          { label: "Called", value: stats.called },
          { label: "In consultation", value: stats.inRoom }
        ].map((k) => (
          <Card key={k.label} className="gap-0 bg-muted/50 p-1 ring-0 shadow-sm">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-card p-4">
              <div className="space-y-2">
                <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                  {k.label}
                </p>
                <p className="font-mono text-[28px] leading-none font-medium tracking-tight">
                  {k.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="gap-0 bg-muted/50 p-1 ring-0 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <PanelTitle title="Today's queue" />
          <div className="flex items-center gap-2">
            <Select
              value={doctorId ?? undefined}
              onValueChange={(v) => setDoctorId(v)}
            >
              <SelectTrigger className="h-8 w-56 font-[350]">
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="font-[350]">
                    {d.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <MoreButton />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl bg-card py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : queue.length === 0 ? (
            <p className="py-8 text-center text-sm font-[350] text-muted-foreground">
              No tokens yet today.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-4 py-2 text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    Token
                  </th>
                  <th className="px-4 py-2 text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    Patient
                  </th>
                  <th className="px-4 py-2 text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    Priority
                  </th>
                  <th className="px-4 py-2 text-left font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {queue.map((t) => (
                  <tr key={t.id} className="border-b border-border-subtle hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono">#{t.tokenNumber}</td>
                    <td className="px-4 py-3 font-medium">{t.patientName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                      {t.status === "WAITING" && typeof t.position === "number" && (
                        <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                          pos {t.position}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {busyId === t.id ? (
                        <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          {["WAITING", "SKIPPED"].includes(t.status) && (
                            <Button
                              size="sm"
                              disabled={busyId === t.id}
                              onClick={() => void act(t, "call")}
                            >
                              Call
                            </Button>
                          )}
                          {["WAITING", "CALLED"].includes(t.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void act(t, "skip")}
                            >
                              Skip
                            </Button>
                          )}
                          {t.status === "SKIPPED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void act(t, "recall")}
                            >
                              Recall
                            </Button>
                          )}
                          {!["COMPLETED", "NO_SHOW"].includes(t.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void act(t, "noShow")}
                            >
                              No-show
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <WalkinDialog
        open={walkinOpen}
        doctors={doctors}
        onClose={() => setWalkinOpen(false)}
        onDone={() => {
          setWalkinOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function WalkinDialog({
  open,
  doctors,
  onClose,
  onDone
}: {
  open: boolean;
  doctors: Doctor[];
  onClose: () => void;
  onDone: () => void;
}): React.JSX.Element {
  const [doctorId, setDoctorId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Token | null>(null);

  async function submit(): Promise<void> {
    if (!doctorId) return setError("Pick a doctor.");
    setBusy(true);
    setError(null);
    try {
      const token = await api.scheduling.walkIn({
        doctorId,
        fullName: fullName || undefined,
        phone: phone || undefined,
        priority: priority as "NORMAL"
      });
      setCreated(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Walk-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-xl border-border bg-background shadow-dialog sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Walk-in registration</DialogTitle>
        </DialogHeader>
        {created ? (
          <div className="space-y-3 py-2 text-center">
            <p className="font-mono text-[28px] leading-none font-medium tracking-tight">
              #{created.tokenNumber}
            </p>
            <p className="text-sm font-[350] text-muted-foreground">
              Token issued for {created.patientName}. The patient can track it live on their phone.
            </p>
            <DialogFooter className="justify-center">
              <Button onClick={onDone}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            {error && (
              <p className="text-xs font-[350] text-destructive">{error}</p>
            )}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                  Doctor
                </Label>
                <Select value={doctorId || undefined} onValueChange={setDoctorId}>
                  <SelectTrigger className="h-9 font-[350]">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="font-[350]">
                        {d.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                  Full name
                </Label>
                <Input
                  className="h-9 bg-muted/40 font-[350] shadow-none"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Patient name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                  Phone
                </Label>
                <Input
                  className="h-9 bg-muted/40 font-[350] shadow-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                  Priority
                </Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9 font-[350]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="SENIOR_CITIZEN">Senior citizen</SelectItem>
                    <SelectItem value="WOMAN_CHILD">Woman / child</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={() => void submit()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {busy ? "Issuing..." : "Issue token"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}



