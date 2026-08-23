"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, tokenStore, ADMIN_ROLES, type ApiUser, type Role } from "@/lib/api";

export default function Guard({
  roles,
  children,
}: {
  roles?: Role[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    let alive = true;
    const next =
      typeof window !== "undefined"
        ? encodeURIComponent(window.location.pathname + window.location.search)
        : "";
    const loginUrl = `/login?next=${next}`;

    const hasToken = !!(tokenStore.getAccess() || tokenStore.getRefresh());
    if (!hasToken) {
      router.replace(loginUrl);
      return;
    }

    // instant paint from cache, then verify with the server
    setState("ok");
    api
      .auth.me()
      .then((user: ApiUser) => {
        if (!alive) return;
        if (roles && !user.roles.some((r) => roles.includes(r.role as Role))) {
          const adminWanted = roles.every((r) => ADMIN_ROLES.includes(r));
          router.replace(adminWanted ? `/login?next=${next}` : "/dashboard");
          return;
        }
      })
      .catch(() => {
        if (!alive) return;
        tokenStore.clear();
        router.replace(loginUrl);
      });

    return () => {
      alive = false;
    };
  }, [router]);

  if (state !== "ok") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <p className="text-sm font-[350]">Checking your session&hellip;</p>
      </div>
    );
  }

  return <>{children}</>;
}
