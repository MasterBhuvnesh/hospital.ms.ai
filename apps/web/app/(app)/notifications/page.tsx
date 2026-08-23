"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type AppNotification } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import Banner from "@/components/Banner";

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
      <div className="stack">
        <div className="skeleton title" />
        <div className="skeleton block" />
        <div className="skeleton block" />
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <p>{unread > 0 ? `${unread} unread` : "You are all caught up."}</p>
        </div>
        {unread > 0 && (
          <button className="btn" onClick={markAll}>
            Mark all read
          </button>
        )}
      </div>

      {error && (
        <Banner kind="error" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      {items.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">Bell</div>
          Nothing here yet. Queue calls, lab releases and bills will show up in this inbox.
        </div>
      ) : (
        <div className="list-card">
          {items.map((n) => (
            <button
              key={n.id}
              className="list-row"
              style={{ width: "100%", textAlign: "left", background: "none", border: 0, borderBottom: "1px solid #f4f4f5", cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}
              onClick={() => open(n)}
            >
              {!n.readAt && <span className="dot" aria-label="Unread" />}
              <span className="badge badge-zinc nowrap">{n.category.replace(/_/g, " ")}</span>
              <span className="grow">
                <span className="bold small" style={{ display: "block" }}>
                  {n.subject}
                </span>
                <span className="muted small">{n.body}</span>
              </span>
              <span className="tiny faint nowrap">{fmtDateTime(n.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
