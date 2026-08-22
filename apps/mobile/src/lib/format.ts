export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(fullName?: string | null): string {
  return fullName?.split(" ")[0] ?? "there";
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(isoOrDate: string): string {
  const d = isoOrDate.length === 10 ? new Date(`${isoOrDate}T12:00:00`) : new Date(isoOrDate);
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

export function isToday(isoOrDate: string): boolean {
  const d = isoOrDate.length === 10 ? new Date(`${isoOrDate}T12:00:00`) : new Date(isoOrDate);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}
