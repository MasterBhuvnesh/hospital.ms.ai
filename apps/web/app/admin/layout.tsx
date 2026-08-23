"use client";

import Guard from "@/components/Guard";
import TopBar from "@/components/TopBar";
import AdminNav from "@/components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard roles={["HOSPITAL_ADMIN", "PLATFORM_ADMIN"]}>
      <TopBar />
      <main className="container page">
        <AdminNav />
        {children}
      </main>
    </Guard>
  );
}
