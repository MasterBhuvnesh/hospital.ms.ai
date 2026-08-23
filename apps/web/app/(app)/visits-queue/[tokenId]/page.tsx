"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, type Token } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import Banner from "@/components/Banner";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, badgeSemantic } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
      <div className="mx-auto w-full max-w-xl space-y-3">
        <Skeleton className="h-6 w-40 bg-surface-muted" />
        <Skeleton className="h-64 w-full bg-surface-muted" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <Banner kind="error">{error ?? "Token not found."}</Banner>
        <Link href="/appointments" className={buttonClassName("outline", "default")}>
          Back to appointments
        </Link>
      </div>
    );
  }

  const status = token.status;
  const flowIndex = FLOW.indexOf(status as (typeof FLOW)[number]);
  const isSkipped = status === "SKIPPED" || status === "NO_SHOW";
  const done = status === "COMPLETED";
  const nearTurn = status === "WAITING" && typeof token.position === "number" && token.position <= 3;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-1 font-[500] tracking-[-0.02em]">Live queue</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-[350] text-muted-foreground">
            Dr. {token.doctorName.replace(/^Dr\.?\s*/i, "")} - {fmtDate(token.tokenDate)}
            {!done && !isSkipped && (
              <>
                {" - "}
                <span aria-hidden className="size-2 animate-pulse rounded-full bg-success" />
                live
              </>
            )}
          </p>
        </div>
        <Link href="/appointments" className={buttonClassName("outline", "sm")}>
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

      <Card className="mt-4 rounded-lg border-border text-center shadow-none">
        <CardContent className="px-5 py-10 font-[350] sm:py-12">
          <div className="text-label font-[450] uppercase tracking-[0.05em] text-muted-foreground">
            Your token
          </div>
          <div className="mt-2 font-[500] leading-none tracking-[-0.04em] text-ink text-[72px] sm:text-display">
            #{token.tokenNumber}
          </div>

          <div className="mt-8 flex flex-wrap items-start justify-center gap-x-10 gap-y-4">
            <div className="min-w-24">
              <div className="text-caption font-[450] uppercase tracking-[0.06em] text-muted-foreground">
                Status
              </div>
              <div className="mt-1.5 flex justify-center">
                <Badge variant="outline" className={statusBadgeClass(status)}>
                  {status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
            <div className="min-w-20">
              <div className="text-caption font-[450] uppercase tracking-[0.06em] text-muted-foreground">
                Position
              </div>
              <div className="mt-1 text-heading-4 font-[500]">
                {done || isSkipped ? "-" : (token.position ?? "-")}
              </div>
            </div>
            <div className="min-w-20">
              <div className="text-caption font-[450] uppercase tracking-[0.06em] text-muted-foreground">
                Est. wait
              </div>
              <div className="mt-1 text-heading-4 font-[500]">
                {done ? "Done" : isSkipped ? "-" : `${token.etaMinutes ?? "?"} min`}
              </div>
            </div>
          </div>

          <ol className="mt-10 space-y-0 text-left">
            {FLOW.map((s, i) => {
              const state =
                flowIndex > i || done ? "done" : flowIndex === i ? "current" : "todo";
              return (
                <li key={s} className="flex items-stretch gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-7 flex-none place-items-center rounded-full border text-caption font-[500]",
                        state === "done" && "border-primary bg-primary text-primary-foreground",
                        state === "current" &&
                          "border-primary bg-background text-foreground ring-4 ring-ring/10",
                        state === "todo" && "border-border bg-background text-subtle",
                      )}
                    >
                      {flowIndex > i || done ? "+" : i + 1}
                    </span>
                    {i < FLOW.length - 1 && (
                      <span
                        aria-hidden
                        className={cn("w-px grow", state === "done" ? "bg-primary/30" : "bg-border-subtle")}
                      />
                    )}
                  </div>
                  <div className="pb-6 pt-1">
                    <span
                      className={cn(
                        "text-sm",
                        state === "done" && "font-[450] text-foreground",
                        state === "current" && "font-[500] text-foreground",
                        state === "todo" && "font-[350] text-subtle",
                      )}
                    >
                      {s.replace(/_/g, " ")}
                    </span>
                    {state === "current" && (
                      <span className="ml-2 align-middle">
                        <Loader2 className="inline size-3.5 animate-spin text-muted-foreground" aria-hidden />
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-caption font-[350] text-subtle">
        This page refreshes automatically every 5 seconds. You can safely leave and come back via
        Appointments.
      </p>
    </div>
  );
}

function statusBadgeClass(status: Token["status"]) {
  switch (status) {
    case "COMPLETED":
      return badgeSemantic.success;
    case "CALLED":
    case "IN_CONSULTATION":
      return badgeSemantic.info;
    case "SKIPPED":
    case "NO_SHOW":
      return badgeSemantic.error;
    case "WAITING":
      return badgeSemantic.warning;
    default:
      return "";
  }
}
