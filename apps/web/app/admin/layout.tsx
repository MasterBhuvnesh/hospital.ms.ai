"use client";

import Guard from "@/components/Guard";
import TopBar from "@/components/TopBar";
import AdminNav from "@/components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard roles={["HOSPITAL_ADMIN", "PLATFORM_ADMIN"]}>
      <div className="flex min-h-screen flex-col bg-background">
        <TopBar />
        <div className="mx-auto flex w-full max-w-7xl flex-1">
          <aside className="hidden w-56 flex-none border-r border-border bg-background md:block">
            <div className="sticky top-14 max-h-[calc(100vh-4rem)] overflow-y-auto p-4">
              <p className="mb-2 px-3 text-label font-[450] uppercase tracking-[0.05em] text-subtle">
                Administration
              </p>
              <AdminNav />
            </div>
          </aside>
          <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <nav aria-label="Admin sections" className="mb-6 border-b border-border pb-4 md:hidden">
              <AdminNav />
            </nav>
            {children}
          </main>
        </div>
      </div>
    </Guard>
  );
}
