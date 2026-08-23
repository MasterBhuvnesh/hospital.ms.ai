import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { router, Stack } from "expo-router";
import {
  CalendarDays,
  Ticket,
  ChevronRight,
  BellRing,
  CalendarPlus,
  Wallet,
  Sparkles,
  Zap,
} from "lucide-react-native";
import { Screen, Card, Badge } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, type Appointment, type Token, type Doctor } from "@/lib/api";
import { greeting, firstName, fmtDate, fmtTime, isToday } from "@/lib/format";

export default function Home() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Record<string, Doctor>>({});
  const [liveToken, setLiveToken] = useState<Token | null>(null);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [appts, docs, notifs] = await Promise.all([
        api.scheduling.appointments(),
        api.directory.doctors(),
        api.comms.notifications().catch(() => null),
      ]);
      setAppointments(appts);
      const map: Record<string, Doctor> = {};
      for (const d of docs) map[d.id] = d;
      setDoctors(map);
      if (notifs) setUnread(notifs.unreadCount);

      const upcomingWithToken = appts
        .filter((a) => a.tokenId && ["BOOKED", "CONFIRMED"].includes(a.status))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
      if (upcomingWithToken?.tokenId) {
        const t = await api.scheduling.token(upcomingWithToken.tokenId).catch(() => null);
        if (t && !["COMPLETED", "NO_SHOW", "CANCELLED"].includes(t.status)) setLiveToken(t);
        else setLiveToken(null);
      } else {
        setLiveToken(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
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

  const nextVisit = appointments
    .filter((a) => ["BOOKED", "CONFIRMED"].includes(a.status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  const actions = [
    { icon: Zap, label: "Walk-in", onPress: () => router.push("/walkin") },
    { icon: CalendarPlus, label: "Book", onPress: () => router.push("/book") },
    { icon: Wallet, label: "Bills", onPress: () => router.push("/payments") },
    { icon: Sparkles, label: "Ask AI", onPress: () => router.push("/ai") },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen loading={loading} error={error}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#208AEF" />}
        >
          <View className="mb-6 mt-2 flex-row items-start justify-between">
            <View>
              <Text className="text-sm text-zinc-500">{greeting()},</Text>
              <Text className="text-[26px] font-bold leading-tight text-zinc-900">
                {firstName(user?.fullName)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              className="rounded-full border border-zinc-100 bg-white p-3"
            >
              <View>
                <BellRing size={20} color="#208AEF" />
                {unread > 0 && (
                  <View className="absolute -right-1 -top-1 h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1">
                    <Text className="text-[9px] font-bold text-white">{unread}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View className="mb-4 flex-row gap-2.5">
            {actions.map((a) => (
              <TouchableOpacity
                key={a.label}
                activeOpacity={0.8}
                onPress={a.onPress}
                className="flex-1 items-center rounded-2xl border border-zinc-100 bg-white py-3.5"
              >
                <a.icon size={20} color="#208AEF" />
                <Text className="mt-1.5 text-[11px] font-bold text-zinc-700">{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {liveToken && (
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/queue/${liveToken.id}`)}>
              <Card className="mb-4 border-primary/20 p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center gap-2">
                      <View className="h-2 w-2 rounded-full bg-green-500" />
                      <Text className="text-xs font-bold tracking-wide text-green-600">LIVE QUEUE</Text>
                    </View>
                    <Text className="mt-1 text-lg font-bold text-zinc-900">
                      {typeof liveToken.position === "number" && liveToken.position > 0
                        ? `${liveToken.position} ${liveToken.position === 1 ? "person" : "people"} ahead of you`
                        : "It's your turn!"}
                    </Text>
                    <Text className="mt-0.5 text-xs text-zinc-500">
                      Dr. {liveToken.doctorName.replace(/^Dr\.\s*/, "")} · token #{liveToken.tokenNumber}
                      {typeof liveToken.etaMinutes === "number" && liveToken.position
                        ? ` · ~${liveToken.etaMinutes} min`
                        : ""}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#d4d4d8" />
                </View>
              </Card>
            </TouchableOpacity>
          )}

          <Text className="mb-2 text-xs font-bold tracking-widest text-zinc-400">NEXT VISIT</Text>

          {!nextVisit ? (
            <Card className="items-center p-5">
              <CalendarDays size={26} color="#d4d4d8" />
              <Text className="mt-2 text-sm text-zinc-500">No upcoming visits</Text>
              <TouchableOpacity onPress={() => router.push("/book")} className="mt-3">
                <Text className="text-sm font-bold text-primary">Book an appointment →</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <Card className="p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <TouchableOpacity
                    disabled={!nextVisit.doctorId}
                    onPress={() =>
                      router.push({ pathname: "/doctor/[doctorId]", params: { doctorId: nextVisit.doctorId } })
                    }
                  >
                    <Text className="text-base font-bold text-zinc-900">
                      {doctors[nextVisit.doctorId]?.fullName ?? "Doctor"}
                    </Text>
                  </TouchableOpacity>
                  <Text className="mt-0.5 text-xs text-zinc-500">
                    {(doctors[nextVisit.doctorId]?.specializations ?? []).join(", ") || "General"}
                  </Text>
                </View>
                {nextVisit.feeSnapshot && (
                  <Badge label={`${nextVisit.feeSnapshot.amount} ${nextVisit.feeSnapshot.currency}`} />
                )}
              </View>
              <View className="mt-3 flex-row items-center border-t border-zinc-100 pt-3">
                <Ticket size={14} color="#208AEF" />
                <Text className="ml-1.5 flex-1 text-xs text-zinc-600">
                  {fmtDate(nextVisit.startsAt)} · {fmtTime(nextVisit.startsAt)}
                  {isToday(nextVisit.startsAt) ? " · today" : ""}
                </Text>
                {nextVisit.tokenId && (
                  <TouchableOpacity onPress={() => router.push(`/queue/${nextVisit.tokenId}`)}>
                    <Text className="text-xs font-bold text-primary">Live queue →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          )}
        </ScrollView>
      </Screen>
    </>
  );
}
