import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/* Native select styled to match Input visuals (Radix Select intentionally skipped).
   Sizing/responsive classes passed via className apply to the wrapper. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <span className={cn("relative block h-9 w-full", className)}>
      <select
        ref={ref}
        className="flex h-full w-full appearance-none items-center rounded-md border border-input bg-background px-3 pr-8 text-sm font-[350] text-foreground shadow-none transition-colors duration-120 ease-out focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/10 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  ),
);
Select.displayName = "Select";
