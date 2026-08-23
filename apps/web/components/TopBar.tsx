"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api, tokenStore, type ApiUser } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/appointments", label: "Appointments" },
  { href: "/records", label: "Records" },
  { href: "/prescriptions", label: "Prescriptions" },
  { href: "/payments", label: "Payments" },
  { href: "/notifications", label: "Notifications" },
  { href: "/copilot", label: "Copilot" },
];

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
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

  const links = [
    ...NAV,
    ...(isAdmin(user) ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="flex flex-none items-center gap-2 text-[15px] font-[500] tracking-[-0.02em] text-foreground"
        >
          <span aria-hidden className="size-2.5 rounded-full bg-ink" />
          Atelier Health
        </Link>

        <nav aria-label="Main" className="scrollbar-none flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors duration-120 ease-out",
                  active
                    ? "bg-surface-muted font-[500] text-foreground"
                    : "font-[350] text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
              >
                {l.label}
                {l.href === "/notifications" && unread > 0 && (
                  <span className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-[500] leading-none text-danger-foreground">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="relative flex-none" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="h-9 gap-2 rounded-md px-2 font-[450]"
          >
            <span
              aria-hidden
              className="grid size-6 place-items-center rounded-full border border-border bg-surface-muted text-xs font-[500]"
            >
              {user ? initials(user.fullName) : "?"}
            </span>
            <span className="hidden max-w-[130px] truncate text-sm md:inline">
              {user?.fullName ?? "..."}
            </span>
          </Button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-border bg-background p-1.5 shadow-dialog">
              <div className="mb-1 border-b border-border-subtle p-2">
                <div className="truncate text-sm font-[400]">{user?.fullName ?? "Signed in"}</div>
                <div className="truncate text-caption font-[350] text-subtle">
                  {user?.email ?? user?.phone ?? ""}
                </div>
              </div>
              <button
                className={cn(
                  buttonVariants.ghost,
                  "block w-full rounded-md px-2.5 py-2 text-left text-sm font-[350] text-danger hover:bg-surface-muted",
                )}
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
