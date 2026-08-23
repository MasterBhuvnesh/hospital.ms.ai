"use client";

import { useEffect, useState } from "react";
import { api, type AuditRow } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import Banner from "@/components/Banner";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge, badgeSemantic } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-1 font-[500] tracking-[-0.02em]">Audit log</h1>
          <p className="mt-1 text-sm font-[350] text-muted-foreground">
            Append-only. Every privileged read and write lands here.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Input
            className="w-full sm:w-52"
            placeholder="Action contains..."
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
          <Input
            className="w-full font-mono text-body-small sm:w-60"
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
        <Skeleton className="h-64 w-full bg-surface-muted" />
      ) : rows.length === 0 ? (
        <Card className="rounded-lg border-border px-6 py-10 text-center shadow-none">
          <p className="text-sm font-[350] text-muted-foreground">
            No audit entries match these filters (showing latest 100).
          </p>
        </Card>
      ) : (
        <>
          <p className="mb-3 text-caption font-[350] text-subtle">
            Showing {rows.length} of {total} matching entries.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a, i) => (
                <TableRow key={a.id ?? `${a.timestamp}-${i}`}>
                  <TableCell className="whitespace-nowrap text-body-small">{fmtDateTime(a.timestamp)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={/break_glass|phi\./i.test(a.action) ? badgeSemantic.error : ""}
                    >
                      {a.action}
                    </Badge>
                    {a.reason && (
                      <div className="mt-1 max-w-64 truncate text-caption text-muted-foreground" title={a.reason}>
                        reason: {a.reason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-body-small">
                    {a.actorRole && <div className="text-caption text-muted-foreground">{a.actorRole}</div>}
                    <span className="font-mono text-caption">{(a.actorId ?? "-").slice(0, 13)}...</span>
                  </TableCell>
                  <TableCell className="text-body-small">
                    {a.resource ?? "-"}
                    {a.resourceId && (
                      <div className="font-mono text-caption text-muted-foreground">
                        {String(a.resourceId).slice(0, 13)}...
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-caption">{a.ip ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </>
  );
}
