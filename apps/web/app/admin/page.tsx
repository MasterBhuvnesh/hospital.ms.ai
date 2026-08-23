"use client";

import { useEffect, useState } from "react";
import { api, tokenStore, type BreakGlassGrant } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import Banner from "@/components/Banner";
import StatCard from "@/components/StatCard";

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
      <div className="page-head">
        <div>
          <h1>Admin console</h1>
          <p>Administrative oversight - no standing clinical read for any admin role.</p>
        </div>
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

      <div className="grid-3">
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

      <section className="section">
        <h2>Break-glass access</h2>
        <p className="muted small mb16">
          Emergency clinical read for one named patient, for a bounded window. The patient is
          notified, and a distinct <code>phi.break_glass</code> audit entry is written.
        </p>

        {result && (
          <Banner kind="success" onDismiss={() => setResult(null)}>
            <strong>Grant {result.grant.id.slice(0, 8)} issued.</strong> Expires{" "}
            {fmtDateTime(result.grant.expiresAt)}. {result.note}
          </Banner>
        )}

        <form className="card" onSubmit={submitBreakGlass} style={{ maxWidth: 640 }}>
          <div className="field">
            <label className="label" htmlFor="pid">
              Patient ID (uuid)
            </label>
            <input
              id="pid"
              className="input mono"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="bgreason">
              Reason (min 10 characters)
            </label>
            <textarea
              id="bgreason"
              className="textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this access is needed right now..."
            />
            <div className="tiny faint mt8">{reason.trim().length}/10 characters minimum</div>
          </div>
          <div className="field">
            <label className="label" htmlFor="ttl">
              Window
            </label>
            <select id="ttl" className="select" value={ttl} onChange={(e) => setTtl(Number(e.target.value))}>
              {[5, 10, 15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-danger"
            disabled={submitting || reason.trim().length < 10 || !UUID_RE.test(patientId.trim())}
          >
            {submitting ? "Requesting..." : `Authorize ${ttl} min of access`}
          </button>
        </form>

        <h3 className="mt24">Active grants</h3>
        {grants.length === 0 ? (
          <p className="muted small mt8">No active break-glass grants.</p>
        ) : (
          <div className="table-wrap mt8">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Granted to</th>
                  <th>Reason</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id}>
                    <td className="mono tiny">{g.patientId.slice(0, 13)}...</td>
                    <td className="mono tiny">{String(g.grantedTo).slice(0, 13)}...</td>
                    <td className="small truncate" style={{ maxWidth: 280 }}>
                      {g.reason}
                    </td>
                    <td className="nowrap small">{fmtDateTime(g.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
