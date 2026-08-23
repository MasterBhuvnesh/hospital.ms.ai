import { cn } from "@/lib/utils";

/* Status badge — design.md §2. The one place hue is allowed:
   pill with a dot, border-200 / bg-50 / text-700 (+ dark 900/950/400). */
const statusStyles: Record<string, { badge: string; dot: string }> = {
  Success: {
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Pending: {
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Cancelled: {
    badge:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
    dot: "bg-red-500",
  },
  Refunded: {
    badge: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

/* Domain status -> semantic bucket */
const ALIASES: Record<string, string> = {
  // Success
  CONFIRMED: "Success",
  PAID: "Success",
  SIGNED: "Success",
  RELEASED: "Success",
  DISPENSED: "Success",
  COMPLETED: "Success",
  CAPTURED: "Success",
  ACTIVE: "Success",
  // Pending
  BOOKED: "Pending",
  ENTERED: "Pending",
  COLLECTED: "Pending",
  PLACED: "Pending",
  READY: "Pending",
  PENDING: "Pending",
  DUE: "Pending",
  UNPAID: "Pending",
  PROCESSING: "Pending",
  // Cancelled
  CANCELLED: "Cancelled",
  NO_SHOW: "Cancelled",
  VOID: "Cancelled",
  FAILED: "Cancelled",
  INACTIVE: "Cancelled",
  // Refunded
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Refunded",
};

function resolve(status: string) {
  return statusStyles[ALIASES[status.toUpperCase()] ?? ""] ?? statusStyles.Refunded;
}

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = resolve(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-[450] leading-none",
        style.badge,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", style.dot)} />
      {status.replace(/_/g, " ")}
    </span>
  );
}
