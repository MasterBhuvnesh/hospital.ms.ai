import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, History } from "lucide-react-native";
import { Screen, Card } from "@/components/ui";
import { api, type Token } from "@/lib/api";
import { fmtDate } from "@/lib/format";

function minutesBetween(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 60000);
}

export default function QueueHistory() {
  const [rows, setRows] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const appts = await api.scheduling.appointments();
      const done = appts.filter((a) => a.status === "COMPLETED" && a.tokenId);
      const tokens = await Promise.all(done.map((a) => api.scheduling.token(a.tokenId!).catch(() => null)));
      setRows(
        tokens
          .filter((t): t is Token => !!t)
          .sort((a, b) =>
            (b.completedAt ?? b.startedAt ?? b.calledAt ?? "").localeCompare(
              a.completedAt ?? a.startedAt ?? a.calledAt ?? "",
            ),
          ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history");
    }
  }, []);

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen error={error}>
        <View className="flex-row items-center px-5 pb-1 pt-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10 }}>
            <ArrowLeft size={22} color="#3f3f46" />
          </TouchableOpacity>
          <Text className="ml-3 text-lg font-bold text-zinc-900">Queue history</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load().finally(() => setRefreshing(false));
              }}
              tintColor="#208AEF"
            />
          }
        >
          {loading ? (
            <Text className="py-6 text-center text-sm text-zinc-400">Loading…</Text>
          ) : rows.length === 0 ? (
            <View className="mt-20 items-center">
              <History size={40} color="#e4e4e7" />
              <Text className="mt-3 px-8 text-center text-sm leading-5 text-zinc-500">
                Completed visits with queue tokens will show up here.
              </Text>
            </View>
          ) : (
            rows.map((t) => {
              const waited = minutesBetween(t.calledAt ?? t.startedAt, t.completedAt);
              const consult = minutesBetween(t.startedAt, t.completedAt);
              return (
                <Card key={t.id} className="mb-2.5 p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="font-bold text-zinc-900">{t.doctorName}</Text>
                      <Text className="mt-0.5 text-xs text-zinc-500">{fmtDate(t.tokenDate)}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-bold text-primary-dark">#{t.tokenNumber}</Text>
                    </View>
                  </View>
                  {(waited != null || consult != null) && (
                    <View className="mt-2.5 flex-row flex-wrap gap-x-4 gap-y-1 border-t border-zinc-100 pt-2.5">
                      {waited != null && (
                        <Text className="text-[11px] font-semibold text-zinc-600">waited ~{waited} min</Text>
                      )}
                      {consult != null && (
                        <Text className="text-[11px] font-semibold text-zinc-600">consult ~{consult} min</Text>
                      )}
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </ScrollView>
      </Screen>
    </>
  );
}
