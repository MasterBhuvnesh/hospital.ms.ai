"use client";

export type BannerKind = "error" | "info" | "success" | "warn";

const CLASS: Record<BannerKind, string> = {
  error: "banner-error",
  info: "banner-info",
  success: "banner-success",
  warn: "banner-warn",
};

const MARK: Record<BannerKind, string> = { error: "!", info: "i", success: "+", warn: "~" };

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
    <div className={`banner ${CLASS[kind]}`} role={kind === "error" ? "alert" : "status"}>
      <span aria-hidden className="bold">
        {MARK[kind]}
      </span>
      <div style={{ flex: 1 }}>{children}</div>
      {onDismiss && (
        <button className="banner-x" onClick={onDismiss} aria-label="Dismiss">
          &times;
        </button>
      )}
    </div>
  );
}
