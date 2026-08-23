"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { api, type EventEnvelope } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import Banner from "@/components/Banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PanelTitle, MoreButton } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Domain events</h1>
          <p className="mt-1 text-sm font-[350] text-muted-foreground">
            The latest {events?.length ?? 100} events published across services.
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      {error && (
        <Banner kind="error" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      {!events ? (
        <Skeleton className="h-64 w-full bg-surface-muted" />
      ) : events.length === 0 ? (
        <Card className="rounded-lg border-border px-6 py-10 text-center shadow-none">
          <p className="text-sm font-[350] text-muted-foreground">No events recorded yet.</p>
        </Card>
      ) : (
        <Card className="gap-0 bg-muted/50 p-1 ring-0 shadow-sm">
          <div className="flex items-center justify-between px-3 py-2">
            <PanelTitle title="Domain events" />
            <MoreButton />
          </div>
          <ul className="divide-y divide-border-subtle rounded-xl bg-card font-[350]">
            {events.map((e) => (
              <li key={e.messageId}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors duration-120 ease-out hover:bg-muted/50 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <Badge
                      variant="outline"
                      className={
                        /phi\.|audit\./i.test(e.topic)
                          ? "border-danger-border bg-danger-background text-danger"
                          : /queue\./i.test(e.topic)
                            ? "border-info-border bg-info-background text-info"
                            : ""
                      }
                    >
                      {e.topic}
                    </Badge>
                    <span className="min-w-0 grow truncate font-mono text-caption text-muted-foreground">
                      {e.messageId.slice(0, 18)}...
                    </span>
                    <span className="whitespace-nowrap font-mono text-caption text-subtle">{fmtDateTime(e.occurredAt)}</span>
                    <ChevronDown
                      aria-hidden
                      className="size-4 flex-none text-subtle transition-transform duration-160 ease-out group-open:rotate-180"
                    />
                  </summary>
                  <pre className="m-0 overflow-x-auto border-t border-border-subtle bg-surface-subtle px-4 py-3 font-mono text-caption leading-[1.5] text-muted-foreground sm:px-5">
                    {pretty(e.payload)}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
