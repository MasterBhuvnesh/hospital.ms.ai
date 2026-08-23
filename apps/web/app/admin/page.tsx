"use client";

import { useEffect, useState } from "react";
import { api, tokenStore, type BreakGlassGrant } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import Banner from "@/components/Banner";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PanelTitle } from "@/components/ui/panel";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AdminOverviewPage() {
  const isAdminPlatform = !!tokenStore
    .getUser()
    ?.roles.some((r) => r.role === "PLATFORM_ADMIN");

  const [usersTotal, setUsersTotal] = useState<number | null>(null);
  const [auditsToday, setAuditsToday] = useState<number | null>(null);
  const [eventsRecent, setEventsRecent] = useState<{ count: number; perSec: number | null }>({
    count: 0,
    perSec: null,
  });
  const [grants, setGrants] = useState<BreakGlassGrant[]>([]);
  const [error, setError] = useState<string | null>(null);

  // break-glass form
  const [patientId, setPatientId] = useState("");
  const [reason, setReason] = useState("");
  const [ttl, setTtl] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ grant: BreakGlassGrant; note: string } | null>(null);

  useEffect(() => {
    setError(null);
    api.admin
      .users({ limit: 1 })
      .then((r) => setUsersTotal(r.total))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load stats."));

    api.admin
      .audit({ from: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(), limit: 100 })
      .then((r) => setAuditsToday(r.total))
      .catch(() => setAuditsToday(0));

    api.admin
      .events()
      .then((r) => {
        const now = Date.now();
        const last60 = r.events.filter((e) => now - new Date(e.occurredAt).getTime() <= 60_000).length;
        setEventsRecent({ count: r.events.length, perSec: Number((last60 / 60).toFixed(2)) });
      })
      .catch(() => {});

    api.admin
      .activeBreakGlass()
      .then((r) => setGrants(r.active))
      .catch(() => {});
  }, []);

  async function submitBreakGlass(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!UUID_RE.test(patientId.trim())) {
      showError("Patient ID must be a valid UUID.");
      return;
    }
    if (reason.trim().length < 10) {
      showError("A typed reason of at least 10 characters is required for break-glass access.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.admin.createBreakGlass({
        patientId: patientId.trim(),
        reason: reason.trim(),
        ttlMinutes: ttl,
      });
      setResult(res);
      setPatientId("");
      setReason("");
      const active = await api.admin.activeBreakGlass().catch(() => ({ active: [] }));
      setGrants(active.active);
    } catch (e2) {
      showError(e2 instanceof Error ? e2.message : "Break-glass request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 8000);
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-medium tracking-tight">Admin console</h1>
        <p className="mt-1 text-sm font-[350] text-muted-foreground">
          Administrative oversight - no standing clinical read for any admin role.
        </p>
      </div>

      {isAdminPlatform && (
        <Banner kind="warn">
          <strong>Platform admin:</strong> you have no clinical data access - with or without
          break-glass. Tenancy administration and clinical access are separate privileges by design.
        </Banner>
      )}

      {error && (
        <Banner kind="error" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Registered users" value={usersTotal ?? "..."} sub="visible to your tenancy scope" />
        <StatCard
          label="Audit entries today"
          value={auditsToday ?? "..."}
          sub="append-only audit log"
        />
        <StatCard
          label="Recent domain events"
          value={eventsRecent.count}
          sub={
            eventsRecent.perSec != null ? `${eventsRecent.perSec}/sec over the last minute` : "latest 100 retained"
          }
        />
      </div>

      <section className="mt-8">
        <h2 className="text-heading-2 font-[500] tracking-[-0.01em]">Break-glass access</h2>
        <p className="mt-1 max-w-2xl text-sm font-[350] text-muted-foreground">
          Emergency clinical read for one named patient, for a bounded window. The patient is
          notified, and a distinct{" "}
          <code className="rounded-sm bg-surface-muted px-1 py-0.5 font-mono text-caption">phi.break_glass</code>{" "}
          audit entry is written.
        </p>

        {result && (
          <Banner kind="success" onDismiss={() => setResult(null)}>
            <strong>Grant {result.grant.id.slice(0, 8)} issued.</strong> Expires{" "}
            {fmtDateTime(result.grant.expiresAt)}. {result.note}
          </Banner>
        )}

        <Card className="mt-5 max-w-xl rounded-lg border-border shadow-none">
          <CardHeader className="p-5 pb-3">
            <CardTitle>Request emergency access</CardTitle>
            <CardDescription>All break-glass grants expire automatically.</CardDescription>
          </CardHeader>
          <CardContent className="font-[350]">
            <form onSubmit={submitBreakGlass} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pid">Patient ID (uuid)</Label>
                <Input
                  id="pid"
                  className="font-mono text-body-small"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bgreason">Reason (min 10 characters)</Label>
                <Textarea
                  id="bgreason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why this access is needed right now..."
                />
                <p className="text-caption font-[350] text-subtle">
                  {reason.trim().length}/10 characters minimum
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ttl">Window</Label>
                <Select id="ttl" value={ttl} onChange={(e) => setTtl(Number(e.target.value))}>
                  {[5, 10, 15, 30, 60].map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="submit"
                variant="destructive"
                disabled={submitting || reason.trim().length < 10 || !UUID_RE.test(patientId.trim())}
              >
                {submitting ? "Requesting..." : `Authorize ${ttl} min of access`}
              </Button>
            </form>
          </CardContent>
        </Card>

        <h3 className="mb-3 mt-8 text-heading-3 font-[500] tracking-[-0.01em]">Active grants</h3>
        {grants.length === 0 ? (
          <p className="text-sm font-[350] text-muted-foreground">No active break-glass grants.</p>
        ) : (
          <Card className="mt-3 gap-0 bg-muted/50 p-1 ring-0 shadow-sm">
            <div className="flex items-center justify-between px-3 py-2">
              <PanelTitle title="Active grants" />
            </div>
            <div className="overflow-hidden rounded-xl bg-card py-2">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Patient</TableHead>
                    <TableHead>Granted to</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grants.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono text-caption">{g.patientId.slice(0, 13)}...</TableCell>
                      <TableCell className="font-mono text-caption">{String(g.grantedTo).slice(0, 13)}...</TableCell>
                      <TableCell className="max-w-72 truncate">{g.reason}</TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-body-small">{fmtDateTime(g.expiresAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </section>
    </>
  );
}
