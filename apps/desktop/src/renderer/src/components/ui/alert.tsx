import * as React from "react";
import { cn } from "@/lib/utils";

export const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative w-full rounded-lg border px-4 py-3 font-[350]", className)}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn("mb-1 text-sm font-[400] leading-[1.35] tracking-[-0.01em]", className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm font-[350] leading-[1.5]", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

/* Semantic wrappers from design.md sections 8 and 25 */
export const alertSemantic = {
  success: "border-success-border bg-success-background text-success",
  error: "border-danger-border bg-danger-background text-danger",
  warning: "border-warning-border bg-warning-background text-warning",
  info: "border-info-border bg-info-background text-info",
} as const;
