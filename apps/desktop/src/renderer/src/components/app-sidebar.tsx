"use client";

import {
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
  Stethoscope
} from "lucide-react";

import { useSession } from "@/context/SessionContext";
import { api } from "@/lib/api";
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

export type View =
  | "reception"
  | "doctor"
  | "records"
  | "prescriptions"
  | "payments"
  | "notifications"
  | "copilot"
  | "admin-users"
  | "admin-audit"
  | "admin-events";

const RECEPTION_NAV: { view: View; label: string; icon: typeof House }[] = [
  { view: "reception", label: "Reception desk", icon: House },
  { view: "records", label: "Records", icon: FolderOpen },
  { view: "prescriptions", label: "Prescriptions", icon: FileText },
  { view: "payments", label: "Bills & payments", icon: ReceiptText },
  { view: "notifications", label: "Notifications", icon: Bell },
  { view: "copilot", label: "Copilot", icon: Sparkles },
];

const DOCTOR_NAV: { view: View; label: string; icon: typeof House }[] = [
  { view: "doctor", label: "My clinic", icon: Stethoscope },
  { view: "records", label: "Records", icon: FolderOpen },
  { view: "prescriptions", label: "Prescriptions", icon: FileText },
  { view: "notifications", label: "Notifications", icon: Bell },
  { view: "copilot", label: "Copilot", icon: Sparkles },
];

const ADMIN_NAV: { view: View; label: string; icon: typeof House }[] = [
  { view: "admin-users", label: "Users & roles", icon: ShieldCheck },
  { view: "admin-audit", label: "Audit log", icon: ScrollText },
  { view: "admin-events", label: "Live events", icon: Radio },
];

export function AppSidebar({
  active,
  onNavigate,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  active: View;
  onNavigate: (view: View) => void;
}) {
  const { user, signOut } = useSession();
  const role = user?.roles?.[0]?.role ?? "PATIENT";
  const nav = role === "DOCTOR" ? DOCTOR_NAV : role === "PATIENT" ? RECEPTION_NAV : role === "RECEPTIONIST" ? RECEPTION_NAV : ADMIN_NAV;

  async function signOutAndExit(): Promise<void> {
    await api.auth.logout();
    signOut();
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a>
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <LineChart className="size-4" />
                </div>
                <span className="flex flex-col gap-0.5 leading-none">
                  <span className="font-[500]">Atelier Health</span>
                  <span className="text-xs font-[350] text-muted-foreground">
                    {role === "DOCTOR" ? "Clinic" : role === "RECEPTIONIST" ? "Front desk" : "Workstation"}
                  </span>
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{role === "DOCTOR" ? "Clinic" : "Workstation"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton
                    isActive={active === item.view}
                    tooltip={item.label}
                    onClick={() => onNavigate(item.view)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-[450] text-muted-foreground">
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
              onClick={() => void signOutAndExit()}
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


