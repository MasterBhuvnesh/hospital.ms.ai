"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ROLES, type AdminUser, type Role } from "@/lib/api";
import Banner from "@/components/Banner";

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
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>{total != null ? `${total} user${total === 1 ? "" : "s"} in scope` : "Loading..."}</p>
        </div>
        <input
          className="input"
          style={{ maxWidth: 300 }}
          placeholder="Search name, email or phone..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
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
        <div className="skeleton block" />
      ) : users.length === 0 ? (
        <div className="card empty">No users match this search.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const needsHospital =
                  rolePick[u.id] &&
                  !["PATIENT", "PLATFORM_ADMIN", "HOSPITAL_ADMIN"].includes(rolePick[u.id]);
                return (
                  <tr key={u.id}>
                    <td className="bold nowrap">{u.fullName}</td>
                    <td className="small muted">
                      {u.email ?? "-"}
                      <br />
                      {u.phone ?? ""}
                    </td>
                    <td>
                      <span className="row" style={{ gap: 4 }}>
                        {(u.roles ?? []).map((r, i) => (
                          <span key={`${u.id}-r-${i}`} className="badge badge-zinc">
                            {r.role.replace(/_/g, " ")}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive === false ? "badge-red" : "badge-green"}`}>
                        {u.isActive === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td style={{ minWidth: 320 }}>
                      <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                        <button
                          className={`btn btn-sm ${u.isActive === false ? "btn-primary" : "btn-outline-danger"}`}
                          disabled={actingId === u.id}
                          onClick={() => toggleActive(u)}
                        >
                          {u.isActive === false ? "Activate" : "Deactivate"}
                        </button>
                        <select
                          className="select"
                          style={{ width: 150, padding: "5px 8px", fontSize: 12.5 }}
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
                        </select>
                        {needsHospital && (
                          <input
                            className="input mono"
                            style={{ width: 190, padding: "5px 8px", fontSize: 12 }}
                            placeholder="hospital uuid"
                            value={hospitalPick[u.id] ?? ""}
                            onChange={(e) =>
                              setHospitalPick((prev) => ({ ...prev, [u.id]: e.target.value }))
                            }
                          />
                        )}
                        <button
                          className="btn btn-sm"
                          disabled={!rolePick[u.id] || actingId === u.id}
                          onClick={() => grantRole(u)}
                        >
                          Grant
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
