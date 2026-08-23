"use client";

import Guard from "@/components/Guard";
import TopBar from "@/components/TopBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard>
      <div className="flex min-h-screen flex-col bg-background">
        <TopBar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </Guard>
  );
}
