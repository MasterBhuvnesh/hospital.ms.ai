import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { api } from "@/lib/api";

const IST = "+05:30";

const nextDays = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() + i * 86_400_000);
    return d.toISOString().slice(0, 10);
  });

export function SlotPicker({
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
        setSlots(a.slots);
        if (!a.slots.some((s) => s.available)) setNote("No open slots this day - try another.");
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
    <View>
      <View className="mb-3 flex-row gap-2">
        {days.map((d, i) => {
          const dt = new Date(`${d}T12:00:00`);
          const active = d === date;
          return (
            <TouchableOpacity
              key={d}
              onPress={() => setDate(d)}
              className={`flex-1 items-center rounded-xl py-2 ${
                active ? "bg-primary" : "bg-zinc-100"
              }`}
            >
              <Text className={`text-[10px] font-bold ${active ? "text-white/80" : "text-zinc-400"}`}>
                {i === 0 ? "TODAY" : dt.toLocaleDateString([], { weekday: "short" }).toUpperCase()}
              </Text>
              <Text className={`text-sm font-bold ${active ? "text-white" : "text-zinc-700"}`}>
                {dt.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color="#208AEF" style={{ paddingVertical: 16 }} />
      ) : note ? (
        <Text className="py-3 text-center text-xs text-zinc-500">{note}</Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {slots.map((s) => {
            const isSelected = selected === s.time && s.available;
            return (
              <TouchableOpacity
                key={s.time}
                disabled={!s.available}
                onPress={() => onSelect(new Date(`${date}T${s.time}:00${IST}`).toISOString())}
                className={`rounded-lg border px-3 py-2 ${
                  isSelected
                    ? "border-primary bg-primary"
                    : s.available
                      ? "border-zinc-200 bg-white"
                      : "border-zinc-100 bg-zinc-50 opacity-40"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? "text-white" : s.available ? "text-zinc-700" : "text-zinc-400 line-through"
                  }`}
                >
                  {s.time}
                  {s.reason === "booked" ? "" : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
