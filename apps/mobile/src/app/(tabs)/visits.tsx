import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, SectionList, RefreshControl } from "react-native";
import { router, Stack } from "expo-router";
import { CalendarDays } from "lucide-react-native";
import { Screen, Card, Badge } from "@/components/ui";
import { useAlert } from "@/components/CustomAlert";
import { api, type Appointment, type Doctor } from "@/lib/api";
import { fmtDate, fmtTime } from "@/lib/format";

const UPCOMING = ["BOOKED", "CONFIRMED"];

export default function Visits() {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mintingId, setMintingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Record<string, Doctor>>({});

  const load = useCallback(async () => {
    try {
      setError(null);
      const [appts, docs] = await Promise.all([api.scheduling.appointments(), api.directory.doctors()]);
      setAppointments(appts.sort((a, b) => b.startsAt.localeCompare(a.startsAt)));
      const map: Record<string, Doctor> = {};
      for (const d of docs) map[d.id] = d;
      setDoctors(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load visits");
    }
  }, []);

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }, [load]);

  function getToken(appointment: Appointment) {
    setMintingId(appointment.id);
    api.scheduling
      .mintToken(appointment.id)
      .then(async (token) => {
        await load();
        router.push(`/queue/${token.id}`);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not get a token"))
      .finally(() => setMintingId(null));
  }

  function confirmCancel(appointment: Appointment) {
    alert.show({
      title: "Cancel appointment?",
      message: `Your visit on ${fmtDate(appointment.startsAt)} at ${fmtTime(appointment.startsAt)} will be cancelled.`,
      buttons: [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel visit",
          style: "destructive",
          onPress: () =>
            api.scheduling
              .cancel(appointment.id)
              .then(load)
              .catch((e) => setError(e instanceof Error ? e.message : "Cancel failed")),
        },
      ],
    });
  }

  const sections = useMemo(
    () =>
      [
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
            <Text className="mb-2 mt-5 text-xs font-bold tracking-widest text-zinc-400">
              {section.title.toUpperCase()}
            </Text>
          )}
          ListEmptyComponent={
            <View className="mt-24 items-center">
              <CalendarDays size={40} color="#e4e4e7" />
              <Text className="mt-3 text-sm text-zinc-500">No appointments yet</Text>
              <TouchableOpacity onPress={() => router.push("/book")} className="mt-2">
                <Text className="text-sm font-bold text-primary">Book one now →</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const doctor = doctors[item.doctorId];
            const live = UPCOMING.includes(item.status) && item.tokenId;
            return (
              <Card className="mb-3 p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="font-bold text-zinc-900">{doctor?.fullName ?? "Doctor"}</Text>
                    <Text className="mt-0.5 text-xs text-zinc-500">
                      {(doctor?.specializations ?? []).join(", ") || "General"}
                      {item.feeSnapshot ? ` · ${item.feeSnapshot.amount} ${item.feeSnapshot.currency}` : ""}
                    </Text>
                  </View>
                  {live ? (
                    <Badge label="LIVE" />
                  ) : !UPCOMING.includes(item.status) ? (
                    <Badge label={item.status} />
                  ) : null}
                </View>
                <View className="mt-3 flex-row items-center justify-between border-t border-zinc-100 pt-3">
                  <Text className="text-xs text-zinc-600">
                    {fmtDate(item.startsAt)} · {fmtTime(item.startsAt)}
                  </Text>
                  {live ? (
                    <TouchableOpacity onPress={() => router.push(`/queue/${item.tokenId}`)}>
                      <Text className="text-xs font-bold text-primary">Track queue →</Text>
                    </TouchableOpacity>
                  ) : UPCOMING.includes(item.status) ? (
                    <View className="flex-row gap-3">
                      {!item.tokenId && (
                        <TouchableOpacity disabled={mintingId === item.id} onPress={() => getToken(item)}>
                          <Text className={`text-[11px] font-bold ${mintingId === item.id ? "text-primary/50" : "text-primary"}`}>
                            GET TOKEN
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => router.push({ pathname: "/reschedule/[appointmentId]", params: { appointmentId: item.id } })}>
                        <Text className="text-[11px] font-bold text-zinc-500">RESCHEDULE</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmCancel(item)}>
                        <Text className="text-[11px] font-bold text-red-500">CANCEL</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </Card>
            );
          }}
        />
      </Screen>
    </>
  );
}
