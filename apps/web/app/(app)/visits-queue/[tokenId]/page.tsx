"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type Token } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import Banner from "@/components/Banner";

const FLOW = ["WAITING", "CALLED", "IN_CONSULTATION", "COMPLETED"] as const;

export default function VisitQueuePage() {
  const params = useParams<{ tokenId: string }>();
  const tokenId = params?.tokenId;

  const [token, setToken] = useState<Token | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const t = await api.scheduling.token(tokenId as string);
        if (!alive) return;
        setToken(t);
        setError(null);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Could not load your token.");
      } finally {
        if (alive) {
          setLoading(false);
          timer = setTimeout(poll, 5000);
        }
      }
    }

    poll();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [tokenId]);

  if (loading && !token) {
    return (
      <div className="loading-pane">
        <div className="spinner" />
        <p className="small mt8">Loading your live token&hellip;</p>
      </div>
    );
  }

  if (!token) {
    return (
      <>
        <Banner kind="error">{error ?? "Token not found."}</Banner>
        <Link href="/appointments" className="btn">
          Back to appointments
        </Link>
      </>
    );
  }

  const status = token.status;
  const flowIndex = FLOW.indexOf(status as (typeof FLOW)[number]);
  const isSkipped = status === "SKIPPED" || status === "NO_SHOW";
  const done = status === "COMPLETED";
  const nearTurn = status === "WAITING" && typeof token.position === "number" && token.position <= 3;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="page-head" style={{ marginBottom: 10 }}>
        <div>
          <h1>Live queue</h1>
          <p className="small muted">
            Dr. {token.doctorName.replace(/^Dr\.?\s*/i, "")} - {fmtDate(token.tokenDate)}
            {!done && !isSkipped && (
              <span className="nowrap">
                {" "}
                - <span className="live-dot" />live
              </span>
            )}
          </p>
        </div>
        <Link href="/appointments" className="btn btn-sm">
          Appointments
        </Link>
      </div>

      {error && (
        <Banner kind="warn" onDismiss={() => setError(null)}>
          Last refresh failed ({error}). Retrying every 5 seconds.
        </Banner>
      )}

      {nearTurn && (
        <Banner kind="success">
          <strong>You are almost up!</strong> Only {token.position} ahead of you. Please head to the
          consultation area now.
        </Banner>
      )}

      {isSkipped && (
        <Banner kind="warn">
          <strong>Your turn was skipped.</strong> Please contact the front desk - they can recall your
          token.
        </Banner>
      )}

      {status === "CALLED" && (
        <Banner kind="info">
          <strong>You are being called in.</strong> Please proceed to the consultation room.
        </Banner>
      )}

      <div className="card token-hero">
        <div className="stat-label">Your token</div>
        <div className="token-number">#{token.tokenNumber}</div>
        <div className="token-meta">
          <div>
            <div className="k">Status</div>
            <div className="v" style={{ fontSize: 15 }}>
              {status.replace(/_/g, " ")}
            </div>
          </div>
          <div>
            <div className="k">Position</div>
            <div className="v">{done || isSkipped ? "-" : (token.position ?? "-")}</div>
          </div>
          <div>
            <div className="k">Est. wait</div>
            <div className="v">
              {done ? "Done" : isSkipped ? "-" : `${token.etaMinutes ?? "?"} min`}
            </div>
          </div>
        </div>

        <div className="stepper">
          {FLOW.map((s, i) => {
            const cls =
              flowIndex > i || done ? "done" : flowIndex === i ? "current" : "";
            return (
              <div key={s} className={`step-node ${cls}`}>
                <span className="step-bullet">{flowIndex > i || done ? "+" : i + 1}</span>
                <div className="step-name">{s.replace(/_/g, " ")}</div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="center muted tiny mt16">
        This page refreshes automatically every 5 seconds. You can safely leave and come back via
        Appointments.
      </p>
    </div>
  );
}
