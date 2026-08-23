"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, tokenStore, type ApiUser } from "@/lib/api";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

function isAdmin(u: ApiUser | null) {
  return !!u?.roles.some((r) => r.role === "HOSPITAL_ADMIN" || r.role === "PLATFORM_ADMIN");
}

export default function TopBar() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(tokenStore.getUser());
    api.auth
      .me()
      .then(setUser)
      .catch(() => {});
    api.comms
      .notifications()
      .then((r) => setUnread(r.unreadCount))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  async function signOut() {
    try {
      await api.auth.logout();
    } catch {
      tokenStore.clear();
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href="/dashboard" className="brand">
          <span className="brand-dot" />
          Atelier Health
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/appointments">Appointments</Link>
          <Link href="/records">Records</Link>
          <Link href="/prescriptions">Prescriptions</Link>
          <Link href="/payments">Payments</Link>
          <Link href="/notifications">
            Notifications{unread > 0 && <span className="badge-count">{unread > 99 ? "99+" : unread}</span>}
          </Link>
          <Link href="/copilot">Copilot</Link>
          {isAdmin(user) && <Link href="/admin">Admin</Link>}
        </nav>
        <div className="user-menu" onClick={(e) => e.stopPropagation()}>
          <button className="user-btn" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu">
            <span className="avatar">{user ? initials(user.fullName) : "?"}</span>
            <span className="hide-sm truncate" style={{ maxWidth: 130 }}>
              {user?.fullName ?? "..."}
            </span>
          </button>
          {menuOpen && (
            <div className="dropdown" role="menu">
              <div className="dd-head">
                <div className="bold small truncate">{user?.fullName ?? "Signed in"}</div>
                <div className="tiny faint truncate">{user?.email ?? user?.phone ?? ""}</div>
              </div>
              <button
                className="dd-item danger"
                onClick={signOut}
                role="menuitem"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
