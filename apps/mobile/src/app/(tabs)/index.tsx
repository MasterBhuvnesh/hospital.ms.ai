import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { router, Stack } from "expo-router";
import { CalendarDays, Ticket, ChevronRight, BellRing } from "lucide-react-native";
import { Screen, Card, Badge, Skeleton } from "@/components/ui";
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
        api.appointments(),
        api.doctors(),
        api.notifications().catch(() => null),
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
        const t = await api.token(upcomingWithToken.tokenId).catch(() => null);
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen loading={loading} error={error}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#208AEF" />}
        >
          <View className="flex-row items-start justify-between mt-2 mb-6">
            <View>
              <Text className="text-sm text-zinc-500">{greeting()},</Text>
              <Text className="text-[26px] font-bold text-zinc-900 leading-tight">{firstName(user?.fullName)}</Text>
            </View>
            {unread > 0 && (
              <View className="bg-white rounded-full p-3 border border-zinc-100">
                <View>
                  <BellRing size={20} color="#208AEF" />
                  <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[16px] h-4 items-center justify-center px-1">
                    <Text className="text-[9px] font-bold text-white">{unread}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {liveToken && (
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/queue/${liveToken.id}`)}>
              <Card className="p-4 mb-4 border-primary/20">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center gap-2">
                      <View className="w-2 h-2 rounded-full bg-green-500" />
                      <Text className="text-xs font-bold text-green-600 tracking-wide">LIVE QUEUE</Text>
                    </View>
                    <Text className="text-zinc-900 font-bold text-lg mt-1">
                      {typeof liveToken.position === "number" && liveToken.position > 0
                        ? `${liveToken.position} ${liveToken.position === 1 ? "person" : "people"} ahead of you`
                        : "It's your turn!"}
                    </Text>
                    <Text className="text-xs text-zinc-500 mt-0.5">
                      Dr. {liveToken.doctorName.replace(/^Dr\.\s*/, "")} · token #{liveToken.tokenNumber}
                      {typeof liveToken.etaMinutes === "number" && liveToken.position ? ` · ~${liveToken.etaMinutes} min` : ""}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#d4d4d8" />
                </View>
              </Card>
            </TouchableOpacity>
          )}

          <Text className="text-xs font-bold text-zinc-400 tracking-widest mb-2">NEXT VISIT</Text>

          {!nextVisit ? (
            <Card className="p-5 items-center">
              <CalendarDays size={26} color="#d4d4d8" />
              <Text className="text-zinc-500 text-sm mt-2">No upcoming visits</Text>
              <Text className="text-zinc-400 text-xs mt-1 text-center">
                Booking opens soon — your appointments will appear here.
              </Text>
            </Card>
          ) : (
            <Card className="p-4">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-zinc-900 font-bold text-base">
                    {doctors[nextVisit.doctorId]?.fullName ?? "Doctor"}
                  </Text>
                  <Text className="text-xs text-zinc-500 mt-0.5">
                    {(doctors[nextVisit.doctorId]?.specializations ?? []).join(", ") || "General"}
                  </Text>
                </View>
                {nextVisit.feeSnapshot && (
                  <Badge label={`${nextVisit.feeSnapshot.amount} ${nextVisit.feeSnapshot.currency}`} />
                )}
              </View>
              <View className="flex-row items-center mt-3 pt-3 border-t border-zinc-100">
                <Ticket size={14} color="#208AEF" />
                <Text className="text-xs text-zinc-600 ml-1.5 flex-1">
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

          {!nextVisit && (
            <Skeleton className="h-24 mt-4" />
          )}
        </ScrollView>
      </Screen>
    </>
  );
}
