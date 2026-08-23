"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type EventEnvelope } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import Banner from "@/components/Banner";

function pretty(payload: unknown, max = 280): string {
  try {
    const s = JSON.stringify(payload, null, 2) ?? "";
    return s.length > max ? `${s.slice(0, max)}...` : s;
  } catch {
    return String(payload);
  }
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventEnvelope[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.admin
      .events()
      .then((r) => setEvents(r.events))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load events."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Domain events</h1>
          <p>The latest {events?.length ?? 100} events published across services.</p>
        </div>
        <button className="btn" onClick={load}>
          Refresh
        </button>
      </div>

      {error && (
        <Banner kind="error" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      {!events ? (
        <div className="skeleton block" />
      ) : events.length === 0 ? (
        <div className="card empty">No events recorded yet.</div>
      ) : (
        <div className="list-card">
          {events.map((e) => (
            <details key={e.messageId} style={{ borderBottom: "1px solid #f4f4f5" }}>
              <summary
                style={{
                  listStyle: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                }}
              >
                <span
                  className={`badge ${
                    /phi\.|audit\./i.test(e.topic)
                      ? "badge-red"
                      : /queue\./i.test(e.topic)
                        ? "badge-blue"
                        : "badge-zinc"
                  }`}
                >
                  {e.topic}
                </span>
                <span className="grow tiny muted truncate mono">{e.messageId.slice(0, 18)}...</span>
                <span className="tiny faint nowrap">{fmtDateTime(e.occurredAt)}</span>
              </summary>
              <pre
                className="mono"
                style={{
                  background: "#fafafa",
                  margin: 0,
                  padding: "10px 16px 14px",
                  fontSize: 11.5,
                  overflowX: "auto",
                  color: "#3f3f46",
                }}
              >
                {pretty(e.payload)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
