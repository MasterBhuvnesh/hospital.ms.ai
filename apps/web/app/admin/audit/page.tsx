"use client";

import { useEffect, useState } from "react";
import { api, type AuditRow } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import Banner from "@/components/Banner";

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setError(null);
      api.admin
        .audit({ action: action || undefined, actorId: actorId.trim() || undefined, limit: 100 })
        .then((r) => {
          setRows(r.items);
          setTotal(r.total);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Could not load the audit log."));
    }, action || actorId ? 350 : 0);
    return () => clearTimeout(t);
  }, [action, actorId]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Audit log</h1>
          <p>Append-only. Every privileged read and write lands here.</p>
        </div>
        <div className="row">
          <input
            className="input"
            style={{ width: 220 }}
            placeholder="Action contains..."
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
          <input
            className="input mono"
            style={{ width: 260 }}
            placeholder="Actor id (uuid)"
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <Banner kind="error" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      {!rows ? (
        <div className="skeleton block" />
      ) : rows.length === 0 ? (
        <div className="card empty">No audit entries match these filters (showing latest 100).</div>
      ) : (
        <>
          <p className="tiny faint mb8">
            Showing {rows.length} of {total} matching entries.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Resource</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a, i) => (
                  <tr key={a.id ?? `${a.timestamp}-${i}`}>
                    <td className="nowrap small">{fmtDateTime(a.timestamp)}</td>
                    <td>
                      <span className={`badge ${/break_glass|phi\./i.test(a.action) ? "badge-red" : "badge-zinc"}`}>
                        {a.action}
                      </span>
                      {a.reason && (
                        <div className="tiny muted truncate" style={{ maxWidth: 260 }} title={a.reason}>
                          reason: {a.reason}
                        </div>
                      )}
                    </td>
                    <td className="small">
                      {a.actorRole && <div className="tiny muted">{a.actorRole}</div>}
                      <span className="mono tiny">{(a.actorId ?? "-").slice(0, 13)}...</span>
                    </td>
                    <td className="small">
                      {a.resource ?? "-"}
                      {a.resourceId && (
                        <div className="mono tiny muted">{String(a.resourceId).slice(0, 13)}...</div>
                      )}
                    </td>
                    <td className="mono tiny">{a.ip ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
