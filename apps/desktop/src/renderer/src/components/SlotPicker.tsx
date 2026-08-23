"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const IST = "+05:30";

const nextDays = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10));

export default function SlotPicker({
  doctorId,
  value,
  onSelect,
}: {
  doctorId: string;
  value?: string | null;
  onSelect: (startsAtIso: string) => void;
}) {
  const days = useMemo(() => nextDays(7), []);
  const [date, setDate] = useState(days[0]);
  const [slots, setSlots] = useState<{ time: string; available: boolean; reason?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const selected = value ? new Date(value).toTimeString().slice(0, 5) : null;

  const load = useCallback(async () => {
    setLoading(true);
    setNote(null);
    try {
      const a = await api.directory.availability(doctorId, date);
      if (a.onLeave) {
        setSlots([]);
        setNote("Doctor is on leave this day.");
      } else {
        setSlots(a.slots ?? []);
        if (!(a.slots ?? []).some((s) => s.available)) setNote("No open slots this day - try another.");
      }
    } catch {
      setSlots([]);
      setNote("Could not load availability.");
    } finally {
      setLoading(false);
    }
  }, [doctorId, date]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const dt = new Date(`${d}T12:00:00`);
          const active = d === date;
          return (
            <button
              type="button"
              key={d}
              onClick={() => setDate(d)}
              aria-pressed={active}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1.5 transition-colors duration-120 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-surface-muted",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-[500] uppercase leading-none tracking-[0.06em]",
                  active ? "text-white/75" : "text-muted-foreground",
                )}
              >
                {i === 0 ? "Today" : dt.toLocaleDateString([], { weekday: "short" })}
              </span>
              <span className="text-sm font-[500] leading-tight">{dt.getDate()}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : note ? (
        <p className="py-4 text-center text-sm font-[350] text-muted-foreground">{note}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {slots.map((s) => {
            const isSelected = selected === s.time && s.available;
            return (
              <button
                type="button"
                key={s.time}
                disabled={!s.available}
                onClick={() => onSelect(new Date(`${date}T${s.time}:00${IST}`).toISOString())}
                aria-pressed={isSelected}
                className={cn(
                  "h-8 rounded-md border px-3 text-xs font-[450] transition-colors duration-120 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-subtle disabled:text-subtle disabled:line-through disabled:opacity-60",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-surface-muted",
                )}
              >
                {s.time}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
