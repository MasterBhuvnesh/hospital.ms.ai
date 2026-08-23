"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ROLES, type AdminUser, type Role } from "@/lib/api";
import Banner from "@/components/Banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PanelTitle, MoreButton } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const GRANTABLE: Role[] = ROLES.filter((r) => r !== "PATIENT") as Role[];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  // role grant state per row
  const [rolePick, setRolePick] = useState<Record<string, Role>>({});
  const [hospitalPick, setHospitalPick] = useState<Record<string, string>>({});

  const load = useCallback((query: string) => {
    setError(null);
    api.admin
      .users({ q: query || undefined, limit: 100 })
      .then((r) => {
        setUsers(r.items);
        setTotal(r.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load users."));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [q, load]);

  async function toggleActive(u: AdminUser) {
    setActingId(u.id);
    setError(null);
    try {
      await api.admin.setUserStatus(u.id, !u.isActive);
      setNotice(`${u.fullName} is now ${u.isActive ? "deactivated" : "active"}.`);
      load(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change status.");
    } finally {
      setActingId(null);
    }
  }

  async function grantRole(u: AdminUser) {
    const role = rolePick[u.id];
    if (!role) return;
    setActingId(u.id);
    setError(null);
    try {
      await api.admin.grantRole(u.id, {
        role,
        hospitalId: hospitalPick[u.id]?.trim() || undefined,
      });
      setNotice(`Granted ${role} to ${u.fullName}.`);
      load(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not grant role.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Users</h1>
          <p className="mt-1 text-sm font-[350] text-muted-foreground">
            {total != null ? `${total} user${total === 1 ? "" : "s"} in scope` : "Loading..."}
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search name, email or phone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <Banner kind="error" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}
      {notice && (
        <Banner kind="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Banner>
      )}

      {!users ? (
        <Skeleton className="h-64 w-full bg-surface-muted" />
      ) : users.length === 0 ? (
        <Card className="rounded-lg border-border px-6 py-10 text-center shadow-none">
          <p className="text-sm font-[350] text-muted-foreground">No users match this search.</p>
        </Card>
      ) : (
        <Card className="gap-0 bg-muted/50 p-1 ring-0 shadow-sm">
          <div className="flex items-center justify-between px-3 py-2">
            <PanelTitle title="All users" />
            <MoreButton />
          </div>
          <div className="overflow-hidden rounded-xl bg-card py-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const needsHospital =
                    rolePick[u.id] &&
                    !["PATIENT", "PLATFORM_ADMIN", "HOSPITAL_ADMIN"].includes(rolePick[u.id]);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="whitespace-nowrap font-medium">{u.fullName}</TableCell>
                      <TableCell className="text-body-small text-muted-foreground">
                        {u.email ?? "-"}
                        <br />
                        {u.phone ?? ""}
                      </TableCell>
                      <TableCell>
                        <span className="flex flex-wrap gap-1">
                          {(u.roles ?? []).map((r, i) => (
                            <Badge key={`${u.id}-r-${i}`} variant="outline">
                              {r.role.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={u.isActive === false ? "INACTIVE" : "ACTIVE"} />
                      </TableCell>
                      <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={u.isActive === false ? "default" : "outline"}
                        className={u.isActive === false ? "" : "text-danger hover:bg-danger-background"}
                        disabled={actingId === u.id}
                        onClick={() => toggleActive(u)}
                      >
                        {u.isActive === false ? "Activate" : "Deactivate"}
                      </Button>
                      <Select
                        aria-label={`Grant role to ${u.fullName}`}
                        className="h-8 w-36 text-xs"
                        value={rolePick[u.id] ?? ""}
                        onChange={(e) =>
                          setRolePick((prev) => ({ ...prev, [u.id]: e.target.value as Role }))
                        }
                      >
                        <option value="">Grant role...</option>
                        {GRANTABLE.map((r) => (
                          <option key={r} value={r}>
                            {r.replace(/_/g, " ")}
                          </option>
                        ))}
                      </Select>
                      {needsHospital && (
                        <Input
                          aria-label="Hospital uuid for the granted role"
                          className="h-8 w-44 font-mono text-xs"
                          placeholder="hospital uuid"
                          value={hospitalPick[u.id] ?? ""}
                          onChange={(e) =>
                            setHospitalPick((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                        />
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!rolePick[u.id] || actingId === u.id}
                        onClick={() => grantRole(u)}
                      >
                        Grant
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </>
  );
}
