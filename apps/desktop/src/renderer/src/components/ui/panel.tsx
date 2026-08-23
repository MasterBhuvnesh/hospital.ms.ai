import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PanelTitle({ title }: { title: string }) {
  return (
    <p className="font-mono text-sm font-medium tracking-wide uppercase text-foreground/50">
      {title}
    </p>
  );
}

export function MoreButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="rounded-full border-2 border-comp-border"
      aria-label="More options"
      onClick={onClick}
    >
      <MoreHorizontal aria-hidden />
    </Button>
  );
}
