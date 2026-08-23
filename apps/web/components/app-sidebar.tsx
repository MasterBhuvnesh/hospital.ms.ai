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
  { href: "/app/dashboard", label: "Dashboard", icon: House },
  { href: "/app/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/app/records", label: "Records", icon: FolderOpen },
  { href: "/app/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/app/payments", label: "Bills & payments", icon: ReceiptText },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
  { href: "/app/copilot", label: "Copilot", icon: Sparkles },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: ShieldCheck },
  { href: "/admin/users", label: "Users & roles", icon: ShieldCheck },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/events", label: "Live events", icon: Radio },
];

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
    await api.auth.logout().catch(() => {});
    router.push("/login");
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={isAdminArea ? "/admin" : "/app/dashboard"}>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <LineChart className="size-4" />
                </div>
                <span className="flex flex-col gap-0.5 leading-none">
                  <span className="font-[500]">Atelier Health</span>
                  <span className="text-xs font-[350] text-muted-foreground">
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
          <SidebarGroupLabel>{isAdminArea ? "Platform" : "Care"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-[450] text-zinc-600">
                {(user?.fullName ?? "?")
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <span className="min-w-0 flex-1 truncate text-xs font-[350] text-muted-foreground">
                {user?.email ?? user?.fullName}
              </span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut()}
              tooltip="Sign out"
              className="text-muted-foreground hover:text-danger"
            >
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export const sidebarIconClass = cn();
