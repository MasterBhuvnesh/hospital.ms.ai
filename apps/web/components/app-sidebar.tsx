"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  FileText,
  FolderOpen,
  House,
  LineChart,
  ReceiptText,
  Bell,
  Sparkles,
  ShieldCheck,
  ScrollText,
  Radio,
  LogOut,
} from "lucide-react";

import { api, type ApiUser } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const PATIENT_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/records", label: "Records", icon: FolderOpen },
  { href: "/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/payments", label: "Bills & payments", icon: ReceiptText },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/copilot", label: "Copilot", icon: Sparkles },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: ShieldCheck },
  { href: "/admin/users", label: "Users & roles", icon: ShieldCheck },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/events", label: "Live events", icon: Radio },
];

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function roleLine(user: ApiUser | null, isAdminArea: boolean): string {
  const primary = user?.roles?.[0]?.role;
  if (primary) return primary.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  return isAdminArea ? "Administrator" : "Patient portal";
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const isAdminArea = pathname?.startsWith("/admin");
  const nav = isAdminArea ? ADMIN_NAV : PATIENT_NAV;

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => {});
  }, []);

  async function signOut() {
    await api.auth.logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="Atelier Health"
              className="rounded-lg border border-border bg-card p-2.5 shadow-xs hover:bg-card data-[active=true]:bg-card"
            >
              <Link href={isAdminArea ? "/admin" : "/dashboard"}>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <LineChart className="size-4" />
                </div>
                <span className="flex flex-col gap-1 leading-none">
                  <span className="text-sm font-medium">Atelier Health</span>
                  <span className="text-[11px] text-muted-foreground">
                    {isAdminArea ? "Administration" : "Patient portal"}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 pb-2 text-xs text-foreground">
            {isAdminArea ? "Platform" : "Care"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}
                      className={cn(
                        "rounded-lg px-2.5 py-2 text-sm [&>svg]:size-[18px] [&>svg]:stroke-[1.8]",
                        active
                          ? "border bg-card font-medium shadow-xs hover:bg-card"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon size={18} strokeWidth={1.8} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="relative">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="group-data-[collapsible=icon]:hidden">
              {/* scrim: nav fades out above the profile card */}
              <div className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-[linear-gradient(to_top,var(--sidebar),transparent)]" />
              <div className="flex w-full items-center gap-2.5 rounded-lg border bg-card p-2.5 shadow-xs">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                  {initials(user?.fullName ?? "")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-none">
                    {user?.fullName ?? "Signed in"}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {roleLine(user, !!isAdminArea)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Sign out"
                  className="shrink-0 hover:text-danger"
                  onClick={() => signOut()}
                >
                  <LogOut />
                </Button>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export const sidebarIconClass = cn();
