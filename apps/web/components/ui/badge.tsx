import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "outline";

const variants: Record<BadgeVariant, string> = {
  /* Base style per design.md section 24 */
  outline:
    "inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-border px-2 py-1 text-xs font-[350] leading-none text-foreground",
};

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "outline", ...props }, ref) => (
    <span ref={ref} className={cn(variants[variant], className)} {...props} />
  ),
);
Badge.displayName = "Badge";

/* Semantic triplets (text/background/border) from design.md section 8 */
export const badgeSemantic = {
  success: "border-success-border bg-success-background text-success",
  error: "border-danger-border bg-danger-background text-danger",
  warning: "border-warning-border bg-warning-background text-warning",
  info: "border-info-border bg-info-background text-info",
} as const;
