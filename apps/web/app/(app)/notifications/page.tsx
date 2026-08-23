"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type AppNotification } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import Banner from "@/components/Banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.comms
      .notifications()
      .then((r) => {
        setItems(r.items);
        setUnread(r.unreadCount);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load notifications."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function open(n: AppNotification) {
    if (!n.readAt) {
      api.comms.markRead(n.id).then(load).catch(() => {});
    }
    const link = n.link ?? (typeof n.meta?.link === "string" ? (n.meta.link as string) : null);
    if (!link) return;
    if (/^https?:/i.test(link)) window.open(link, "_blank");
    else {
      router.push(link.startsWith("/") ? link : `/${link}`);
    }
  }

  async function markAll() {
    try {
      await api.comms.markAllRead();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark all as read.");
    }
  }

  if (!items) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-44 bg-surface-muted" />
        <Skeleton className="h-16 w-full bg-surface-muted" />
        <Skeleton className="h-16 w-full bg-surface-muted" />
        <Skeleton className="h-16 w-full bg-surface-muted" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-1 font-[500] tracking-[-0.02em]">Notifications</h1>
          <p className="mt-1 text-sm font-[350] text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "You are all caught up."}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" onClick={markAll}>
            Mark all read
          </Button>
        )}
      </div>

      {error && (
        <Banner kind="error" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      {items.length === 0 ? (
        <Card className="rounded-lg border-border px-6 py-12 text-center shadow-none">
          <p className="text-sm font-[350] text-muted-foreground">
            Nothing here yet. Queue calls, lab releases and bills will show up in this inbox.
          </p>
        </Card>
      ) : (
        <Card className="rounded-lg border-border shadow-none">
          <ul className="divide-y divide-border-subtle font-[350]">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors duration-120 ease-out hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/25 sm:px-5"
                  onClick={() => open(n)}
                >
                  {!n.readAt && (
                    <span aria-label="Unread" className="mt-1.5 size-2 flex-none rounded-full bg-info" />
                  )}
                  <Badge variant="outline" className="mt-0.5 whitespace-nowrap">
                    {n.category.replace(/_/g, " ")}
                  </Badge>
                  <span className="min-w-0 grow">
                    <span className="block text-sm font-[450] text-foreground">{n.subject}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>
                  </span>
                  <span className="whitespace-nowrap text-caption text-subtle">{fmtDateTime(n.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
