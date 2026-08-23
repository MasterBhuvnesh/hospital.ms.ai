"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

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
      <div className="daystrip">
        {days.map((d, i) => {
          const dt = new Date(`${d}T12:00:00`);
          const active = d === date;
          return (
            <button type="button" key={d} onClick={() => setDate(d)} className={`daycell${active ? " on" : ""}`}>
              <div className="dow">{i === 0 ? "TODAY" : dt.toLocaleDateString([], { weekday: "short" })}</div>
              <div className="dom">{dt.getDate()}</div>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="loading-pane">
          <div className="spinner" />
        </div>
      ) : note ? (
        <p className="center muted small" style={{ padding: "14px 0" }}>
          {note}
        </p>
      ) : (
        <div className="slotsgrid">
          {slots.map((s) => {
            const isSelected = selected === s.time && s.available;
            return (
              <button
                type="button"
                key={s.time}
                disabled={!s.available}
                onClick={() => onSelect(new Date(`${date}T${s.time}:00${IST}`).toISOString())}
                className={`slot${isSelected ? " on" : ""}`}
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
