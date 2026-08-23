import { useEffect, useState } from "react";
import { SessionProvider, useSession } from "./context/SessionContext";
import { AppSidebar, type View } from "./components/app-sidebar";
import { Updates } from "./components/Updates";
import { Login } from "./screens/login";
import { Reception } from "./screens/reception";
import { Doctor } from "./screens/doctor";
import {
  AdminAudit,
  AdminEvents,
  AdminUsers,
  Copilot,
  Notifications,
  Payments,
  Prescriptions,
  Records
} from "./screens/misc";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

function Shell(): React.JSX.Element | null {
  const { user, loading } = useSession();
  const [active, setActive] = useState<View>("reception");

  useEffect(() => {
    if (!user || loading) return;
    const role = user.roles?.[0]?.role;
    if (role === "DOCTOR") setActive("doctor");
    else if (role === "RECEPTIONIST") setActive("reception");
    else if (role === "HOSPITAL_ADMIN" || role === "PLATFORM_ADMIN") setActive("admin-users");
    else setActive("reception");
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login />
        <Updates />
      </>
    );
  }

  const views: Record<View, React.ReactNode> = {
    reception: <Reception />,
    doctor: <Doctor />,
    records: <Records />,
    prescriptions: <Prescriptions />,
    payments: <Payments />,
    notifications: <Notifications />,
    copilot: <Copilot />,
    "admin-users": <AdminUsers />,
    "admin-audit": <AdminAudit />,
    "admin-events": <AdminEvents />
  };

  return (
    <SidebarProvider>
      <AppSidebar active={active} onNavigate={setActive} />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-[500] capitalize">
            {active.replace("-", " ")}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{views[active]}</main>
      </SidebarInset>
      <Updates />
    </SidebarProvider>
  );
}

function Loader(): React.JSX.Element {
  return <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />;
}

export default function App(): React.JSX.Element {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}
