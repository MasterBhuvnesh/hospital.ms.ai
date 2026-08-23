import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { ArrowLeft, CalendarPlus, Zap, BadgeCheck, DoorOpen } from "lucide-react-native";
import { Screen, Card, Skeleton, Badge } from "@/components/ui";
import { useAlert } from "@/components/CustomAlert";
import { api, type Doctor, type DoctorSchedule } from "@/lib/api";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function scheduleSummary(s: DoctorSchedule | null | undefined): string | null {
  const weekly = s && typeof s === "object" ? s.weekly : undefined;
  if (!weekly || typeof weekly !== "object") return null;
  const entries = Object.entries(weekly)
    .map(([day, win]) => ({ idx: DAYS.indexOf(String(day).slice(0, 3).toUpperCase()), day: String(day), win }))
    .filter((e) => e.win);
  if (entries.length === 0) return null;
  const open = entries
    .sort((a, b) => (a.idx < 0 ? 99 : a.idx) - (b.idx < 0 ? 99 : b.idx))
    .map((e) => {
      const from = e.win!.from ?? e.win!.start ?? "";
      const to = e.win!.to ?? e.win!.end ?? "";
      const label = e.idx >= 0 ? DAYS[e.idx] : e.day.slice(0, 3).toUpperCase();
      return `${label} ${from}${to ? `–${to}` : ""}`.trim();
    })
    .filter((t) => !t.endsWith("–"))
    .join(" · ");
  return open || null;
}

export default function DoctorDetail() {
  const alert = useAlert();
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [scheduleText, setScheduleText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyWalkIn, setBusyWalkIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const docs = await api.directory.doctors();
        const doc = docs.find((d) => d.id === doctorId) ?? null;
        if (!alive) return;
        setDoctor(doc);
        if (!doc) setError("We could not find this doctor.");
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not load doctor");
      }
      try {
        const s = await api.directory.schedule(String(doctorId));
        if (!alive) return;
        setScheduleText(scheduleSummary(s));
      } catch {
        if (alive) setScheduleText(null);
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [doctorId]);

  function walkIn() {
    if (!doctor) return;
    setBusyWalkIn(true);
    api.scheduling.walkIn(doctor.id)
      .then((token) => router.replace({ pathname: "/queue/[tokenId]", params: { tokenId: token.id } }))
      .catch((e) =>
        alert.show({
          title: "No token issued",
          message: e instanceof Error ? e.message : "The doctor may not be accepting walk-ins right now.",
        }),
      )
      .finally(() => setBusyWalkIn(false));
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen error={error}>
        <View className="flex-row items-center px-5 pb-1 pt-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10 }}>
            <ArrowLeft size={22} color="#3f3f46" />
          </TouchableOpacity>
          <Text className="ml-3 text-lg font-bold text-zinc-900">Doctor profile</Text>
        </View>

        {loading ? (
          <View className="gap-3 px-5 pt-2">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-40 w-full" />
          </View>
        ) : doctor ? (
          <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8">
            <Card className="mb-3 p-5">
              <Text className="text-[26px] font-bold leading-tight text-zinc-900">{doctor.fullName}</Text>
              <View className="mt-2.5 flex-row flex-wrap gap-1.5">
                {(doctor.specializations.length > 0 ? doctor.specializations : ["General"]).map((s) => (
                  <View key={s} className="rounded-full bg-primary-soft px-2.5 py-1">
                    <Text className="text-[11px] font-bold text-primary-dark">{s}</Text>
                  </View>
                ))}
              </View>
              {(doctor.qualification || doctor.registrationNumber) && (
                <View className="mt-3 flex-row items-center gap-1.5">
                  <BadgeCheck size={14} color="#16a34a" />
                  <Text className="text-xs text-zinc-600">
                    {[doctor.qualification, doctor.registrationNumber ? `Reg. ${doctor.registrationNumber}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              )}
            </Card>

            <Card className="mb-3 p-4">
              <View className="flex-row justify-between">
                <Info label="Experience" value={doctor.experienceYears != null ? `${doctor.experienceYears} yrs` : "-"} />
                <Info
                  label="Room"
                  value={doctor.roomNumber ? String(doctor.roomNumber) : "-"}
                  icon={<DoorOpen size={13} color="#a1a1aa" />}
                />
                <Info label="Consultation fee" value={`${doctor.feeConfig.amount} ${doctor.feeConfig.currency}`} />
              </View>
              {scheduleText && (
                <View className="mt-3 border-t border-zinc-100 pt-3">
                  <Text className="text-[11px] font-bold tracking-widest text-zinc-400">WEEKLY SCHEDULE</Text>
                  <Text className="mt-1 text-xs leading-4 text-zinc-600">{scheduleText}</Text>
                </View>
              )}
            </Card>

            <View className="mb-3 flex-row items-center justify-between px-1">
              <Text className="text-[11px] font-bold tracking-widest text-zinc-400">FEE HISTORY</Text>
              <Badge label={doctor.feeHistory?.length ? `v${doctor.feeConfig.version}` : "fee stable"} />
            </View>
            {doctor.feeHistory?.length ? (
              <Card className="mb-3 p-4">
                {[...doctor.feeHistory].reverse().slice(0, 6).map((f, i) => (
                  <View key={`${f.effectiveFrom ?? i}`} className={`flex-row justify-between py-1 ${i > 0 ? "border-t border-zinc-50" : ""}`}>
                    <Text className="text-xs text-zinc-500">{f.effectiveFrom?.slice(0, 10) ?? "-"}</Text>
                    <Text className="text-xs font-semibold text-zinc-800">
                      {f.amount} {f.currency}
                      {i === 0 ? " · current" : ""}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : (
              <Card className="mb-3 p-4">
                <Text className="text-xs text-zinc-400">No fee changes recorded - the fee has been stable.</Text>
              </Card>
            )}

            <TouchableOpacity
              onPress={() =>
                router.push({ pathname: "/book", params: { doctorId: doctor.id } })
              }
              className="mt-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-4"
            >
              <CalendarPlus size={17} color="#fff" />
              <Text className="text-[15px] font-bold text-white">Book appointment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busyWalkIn}
              onPress={walkIn}
              className={`mt-2.5 flex-row items-center justify-center gap-2 rounded-xl border border-primary bg-white py-4 ${
                busyWalkIn ? "opacity-50" : ""
              }`}
            >
              <Zap size={17} color="#208AEF" />
              <Text className="text-[15px] font-bold text-primary">
                {busyWalkIn ? "Getting token…" : "Instant walk-in token"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <Text className="mt-20 px-8 text-center text-sm text-zinc-500">Doctor not found.</Text>
        )}
      </Screen>
    </>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <View className="flex-1 items-start">
      <View className="flex-row items-center gap-1">
        {icon}
        <Text className="text-[10px] font-bold tracking-widest text-zinc-400">{label.toUpperCase()}</Text>
      </View>
      <Text className="mt-0.5 text-sm font-bold text-zinc-800">{value}</Text>
    </View>
  );
}
