"use client";

import { X } from "lucide-react";
import { Alert, alertSemantic } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BannerKind = "error" | "info" | "success" | "warn";

const SEMANTIC: Record<BannerKind, string> = {
  error: alertSemantic.error,
  info: alertSemantic.info,
  success: alertSemantic.success,
  warn: alertSemantic.warning,
};

export default function Banner({
  kind = "info",
  children,
  onDismiss,
}: {
  kind?: BannerKind;
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <Alert role={kind === "error" ? "alert" : "status"} className={cn(SEMANTIC[kind], "mb-4 pr-10")}>
      <div className="text-sm font-[350] leading-[1.5] [&_strong]:font-[400]">{children}</div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute right-2 top-2 size-7 text-current opacity-60 hover:bg-black/5 hover:text-current hover:opacity-100"
        >
          <X />
        </Button>
      )}
    </Alert>
  );
}
