import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, SectionList, RefreshControl } from "react-native";
import { router, Stack } from "expo-router";
import { CalendarDays } from "lucide-react-native";
import { Screen, Card, Badge } from "@/components/ui";
import { api, type Appointment, type Doctor } from "@/lib/api";
import { fmtDate, fmtTime } from "@/lib/format";

const UPCOMING = ["BOOKED", "CONFIRMED"];

export default function Visits() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mintingId, setMintingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Record<string, Doctor>>({});

  const load = useCallback(async () => {
    try {
      setError(null);
      const [appts, docs] = await Promise.all([api.appointments(), api.doctors()]);
      setAppointments(appts.sort((a, b) => b.startsAt.localeCompare(a.startsAt)));
      const map: Record<string, Doctor> = {};
      for (const d of docs) map[d.id] = d;
      setDoctors(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load visits");
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function getToken(appointment: Appointment) {
    setMintingId(appointment.id);
    try {
      const token = await api.mintToken(appointment.id);
      await load();
      router.push(`/queue/${token.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get a token");
    } finally {
      setMintingId(null);
    }
  }

  const sections = useMemo(
    () => [
      { title: "Upcoming", data: appointments.filter((a) => UPCOMING.includes(a.status)).reverse() },
      { title: "History", data: appointments.filter((a) => !UPCOMING.includes(a.status)) },
    ].filter((s) => s.data.length > 0),
    [appointments],
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Screen title="My visits" subtitle="Appointments and live queue tokens" loading />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen title="My visits" subtitle="Appointments and live queue tokens" error={error}>
        <SectionList
          sections={sections}
          keyExtractor={(a) => a.id}
          contentContainerClassName="px-5 pb-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#208AEF" />}
          renderSectionHeader={({ section }) => (
            <Text className="text-xs font-bold text-zinc-400 tracking-widest mt-5 mb-2">
              {section.title.toUpperCase()}
            </Text>
          )}
          ListEmptyComponent={
            <View className="items-center mt-24">
              <CalendarDays size={40} color="#e4e4e7" />
              <Text className="text-zinc-500 text-sm mt-3">No appointments yet</Text>
            </View>
          }
          renderItem={({ item }) => {
            const doctor = doctors[item.doctorId];
            const live = UPCOMING.includes(item.status) && item.tokenId;
            return (
              <Card className="p-4 mb-3">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-2">
                    <Text className="text-zinc-900 font-bold">{doctor?.fullName ?? "Doctor"}</Text>
                    <Text className="text-xs text-zinc-500 mt-0.5">
                      {(doctor?.specializations ?? []).join(", ") || "General"} ·{" "}
                      {item.feeSnapshot ? `${item.feeSnapshot.amount} ${item.feeSnapshot.currency}` : ""}
                    </Text>
                  </View>
                  {live ? (
                    <Badge label="LIVE" />
                  ) : (
                    item.reason && null
                  )}
                </View>
                <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                  <Text className="text-xs text-zinc-600">
                    {fmtDate(item.startsAt)} · {fmtTime(item.startsAt)}
                  </Text>
                  {live ? (
                    <TouchableOpacity onPress={() => router.push(`/queue/${item.tokenId}`)}>
                      <Text className="text-xs font-bold text-primary">Track queue →</Text>
                    </TouchableOpacity>
                  ) : UPCOMING.includes(item.status) ? (
                    <TouchableOpacity
                      disabled={mintingId === item.id}
                      onPress={() => getToken(item)}
                      className={`rounded-full px-3 py-1.5 ${mintingId === item.id ? "bg-primary/50" : "bg-primary"}`}
                    >
                      <Text className="text-white text-[11px] font-bold">
                        {mintingId === item.id ? "Getting…" : "Get token"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Badge label={item.status} />
                  )}
                </View>
              </Card>
            );
          }}
        />
      </Screen>
    </>
  );
}
