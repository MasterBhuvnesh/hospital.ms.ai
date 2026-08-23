import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, TrendingUp } from "lucide-react-native";
import { Screen, Card } from "@/components/ui";
import { Sparkline } from "@/components/Sparkline";
import { api, type LabOrder } from "@/lib/api";

type Series = { parameter: string; unit?: string; points: { date: string; value: number }[] };

function parseValue(raw: string): number | null {
  const n = Number.parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export default function LabTrends() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      let me = await api.clinical.me();
      if (!me) {
        const u = await api.auth.me();
        me = await api.clinical.createSelf({ fullName: u.fullName });
      }
      const orders: LabOrder[] = await api.clinical.labOrders(me.id);
      const released = orders
        .filter((o) => o.status === "RELEASED")
        .slice()
        .sort((a, b) => (a.releasedAt ?? a.createdAt).localeCompare(b.releasedAt ?? b.createdAt));

      const groups = new Map<string, Series>();
      for (const o of released) {
        for (const r of o.results ?? []) {
          const value = parseValue(r.value);
          if (value == null) continue;
          const g = groups.get(r.parameter) ?? { parameter: r.parameter, unit: r.unit, points: [] };
          g.points.push({ date: o.releasedAt ?? o.createdAt, value });
          if (r.unit) g.unit = r.unit;
          groups.set(r.parameter, g);
        }
      }
      setSeries([...groups.values()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load lab trends");
    }
  }, []);

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  const trending = series.filter((s) => s.points.length >= 2);
  const single = series.filter((s) => s.points.length < 2);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen error={error}>
        <View className="flex-row items-center px-5 pb-1 pt-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10 }}>
            <ArrowLeft size={22} color="#3f3f46" />
          </TouchableOpacity>
          <Text className="ml-3 text-lg font-bold text-zinc-900">Lab trends</Text>
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
          ) : series.length === 0 ? (
            <View className="mt-20 items-center">
              <TrendingUp size={40} color="#e4e4e7" />
              <Text className="mt-3 px-8 text-center text-sm leading-5 text-zinc-500">
                Once you have two or more released results for the same parameter, its trend shows up here.
              </Text>
            </View>
          ) : (
            <>
              {trending.map((s) => {
                const values = s.points.map((p) => p.value);
                const latest = values[values.length - 1];
                const prev = values[values.length - 2];
                const delta = latest - prev;
                return (
                  <Card key={s.parameter} className="mb-3 p-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-bold text-zinc-900">{s.parameter}</Text>
                      <View className="flex-row items-center gap-1.5">
                        {delta !== 0 && (
                          <Text
                            className={`text-[11px] font-bold ${delta > 0 ? "text-green-600" : "text-red-500"}`}
                          >
                            {delta > 0 ? "▲" : "▼"}
                          </Text>
                        )}
                        <Text className="text-sm font-bold text-zinc-800">
                          {latest}
                          {s.unit ? ` ${s.unit}` : ""}
                        </Text>
                      </View>
                    </View>
                    <View className="mt-2">
                      <Sparkline points={values} />
                    </View>
                    <Text className="mt-1 text-[10px] text-zinc-400">
                      {s.points.length} results · since {s.points[0].date.slice(0, 10)}
                    </Text>
                  </Card>
                );
              })}

              {single.length > 0 && (
                <Card className="p-4">
                  {single.map((s, i) => (
                    <View
                      key={s.parameter}
                      className={`flex-row justify-between ${i > 0 ? "mt-2 border-t border-zinc-100 pt-2" : ""}`}
                    >
                      <Text className="flex-1 pr-2 text-xs text-zinc-600">{s.parameter}</Text>
                      <Text className="text-xs font-semibold text-zinc-800">
                        {s.points[0].value}
                        {s.unit ? ` ${s.unit}` : ""} · {s.points[0].date.slice(0, 10)}
                      </Text>
                    </View>
                  ))}
                </Card>
              )}
            </>
          )}
        </ScrollView>
      </Screen>
    </>
  );
}
