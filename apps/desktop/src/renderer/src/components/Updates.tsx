import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/context/SessionContext";

interface UpdateStatus {
  state: "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
  version?: string;
  percent?: number;
  message?: string;
}

/**
 * Login-screen-only auto-update UI (docs/electron-auto-update-github.md §5).
 * Renders nothing once the user is signed in.
 */
export function Updates(): React.JSX.Element | null {
  const { user } = useSession();
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const receivedPush = useRef(false);

  useEffect(() => {
    const off = window.desktopBridge.onUpdateStatus((next) => {
      receivedPush.current = true;
      if (next.state === "downloaded") setDismissed(false);
      setStatus((prev) => {
        if (prev?.state === "downloaded" && next.state !== "downloaded" && next.state !== "error") {
          return prev;
        }
        return next;
      });
    });

    window.desktopBridge
      .getUpdateStatus()
      .then((seed) => {
        if (!seed || receivedPush.current) return;
        if (seed.state === "downloaded") setDismissed(false);
        setStatus((prev) => prev ?? seed);
      })
      .catch(() => {});

    return off;
  }, []);

  useEffect(() => {
    window.desktopBridge.setUpdatePolling(!user);
    return () => window.desktopBridge.setUpdatePolling(false);
  }, [user]);

  if (user) return null;
  if (!status) return null;

  const shell =
    "fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-dialog";

  if (status.state === "checking" || status.state === "available") {
    return (
      <div className={shell}>
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-xs font-[350] text-muted-foreground">Checking for updates…</span>
      </div>
    );
  }

  if (status.state === "downloading") {
    return (
      <div className={shell}>
        <Loader2 className="size-4 animate-spin text-primary" />
        <span className="text-xs font-[350] text-muted-foreground">
          Downloading update… {status.percent ?? 0}%
        </span>
      </div>
    );
  }

  if (status.state === "error") {
    if (dismissed) return null;
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
        <span className="text-xs font-[350] text-destructive">Update failed. It will retry automatically.</span>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-md px-2 py-1 text-xs font-[450] text-destructive hover:bg-destructive/10"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (status.state === "downloaded") {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-cta px-4 py-3 text-cta-foreground shadow-dialog">
        <div className="flex flex-col">
          <span className="text-xs font-[500]">Update ready</span>
          <span className="text-[11px] font-[350] opacity-90">
            Restart to install version {status.version ?? ""}.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          disabled={restarting}
          className="rounded-md px-2 py-1 text-xs font-[450] opacity-90 hover:opacity-100"
        >
          Later
        </button>
        <button
          onClick={async () => {
            setRestarting(true);
            try {
              await window.desktopBridge.restartToUpdate();
            } catch {
              setRestarting(false);
            }
          }}
          disabled={restarting}
          className="rounded-md bg-cta-foreground px-2.5 py-1 text-xs font-[500] text-cta disabled:opacity-60"
        >
          {restarting ? "Restarting…" : "Restart now"}
        </button>
      </div>
    );
  }

  return null;
}
