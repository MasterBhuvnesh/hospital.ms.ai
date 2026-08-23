"use client";

import Guard from "@/components/Guard";
import TopBar from "@/components/TopBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard>
      <TopBar />
      <main className="container page">{children}</main>
    </Guard>
  );
}
