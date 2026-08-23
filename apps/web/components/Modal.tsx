"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="animate-overlay-in bg-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 backdrop-blur-[2px] sm:p-12"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`animate-dialog-in w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-xl border border-border bg-background font-[350] shadow-dialog`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-4">
          <h2 className="text-base font-[500] leading-[1.35] tracking-[-0.01em]">{title}</h2>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>
        <ScrollArea className="max-h-[70vh]">
          <div className="p-5">{children}</div>
        </ScrollArea>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
