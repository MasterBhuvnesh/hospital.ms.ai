import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, X, Zap, Search } from "lucide-react-native";
import { Screen, Card, Skeleton } from "@/components/ui";
import { useAlert } from "@/components/CustomAlert";
import { api, type Doctor } from "@/lib/api";

export default function WalkIn() {
  const alert = useAlert();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setDoctors(await api.directory.doctors());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load doctors");
    }
  }, []);

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(
    () =>
      doctors.filter((d) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          d.fullName.toLowerCase().includes(q) ||
          d.specializations.some((s) => s.toLowerCase().includes(q))
        );
      }),
    [doctors, search],
  );

  function getToken(d: Doctor) {
    setBusy(true);
    api.scheduling.walkIn(d.id)
      .then((token) => router.replace({ pathname: "/queue/[tokenId]", params: { tokenId: token.id } }))
      .catch((e) =>
        alert.show({
          title: "No token issued",
          message: e instanceof Error ? e.message : "The doctor may not be accepting walk-ins right now.",
        }),
      )
      .finally(() => setBusy(false));
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen error={error}>
        <View className="flex-row items-center px-5 pb-1 pt-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10 }}>
            <ArrowLeft size={22} color="#3f3f46" />
          </TouchableOpacity>
          <Text className="ml-3 text-lg font-bold text-zinc-900">Walk-in token</Text>
        </View>

        {loading ? (
          <View className="gap-3 px-5 pt-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[76px] w-full" />
            ))}
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-8"
            keyboardShouldPersistTaps="handled"
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
            {selected && (
              <Card className="mb-4 border-primary/30 p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-zinc-900">{selected.fullName}</Text>
                    <Text className="mt-0.5 text-xs text-zinc-500">
                      {selected.specializations.join(", ") || "General"}
                      {" · "}
                      {selected.feeConfig.amount} {selected.feeConfig.currency}
                    </Text>
                    <Text className="mt-2 text-[11px] leading-4 text-zinc-500">
                      You will join this doctor&apos;s live queue right now and be called in order.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={18} color="#a1a1aa" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  disabled={busy}
                  onPress={() => getToken(selected)}
                  className={`mt-4 flex-row items-center justify-center gap-2 rounded-xl py-3.5 ${busy ? "bg-zinc-300" : "bg-primary"}`}
                >
                  <Zap size={16} color="#fff" />
                  <Text className="text-sm font-bold text-white">{busy ? "Getting token…" : "Get token now"}</Text>
                </TouchableOpacity>
              </Card>
            )}

            <View className="mb-3 flex-row items-center rounded-xl border border-zinc-200 bg-white px-3">
              <Search size={16} color="#a1a1aa" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search name or specialization"
                placeholderTextColor="#a1a1aa"
                className="flex-1 px-2.5 py-3 text-[15px] text-zinc-900"
              />
            </View>

            {filtered.map((d) => (
              <Card key={d.id} className="mb-2.5 p-4">
                <TouchableOpacity
                  onPress={() => setSelected(d)}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-1 pr-2">
                    <Text className="font-bold text-zinc-900">{d.fullName}</Text>
                    <Text className="mt-0.5 text-xs text-zinc-500">
                      {d.specializations.join(", ") || "General"} · {d.feeConfig.amount} {d.feeConfig.currency}
                    </Text>
                    {d.experienceYears != null && (
                      <Text className="text-[11px] text-zinc-400">{d.experienceYears} yrs experience</Text>
                    )}
                  </View>
                  <Zap size={16} color="#208AEF" />
                </TouchableOpacity>
              </Card>
            ))}
            {filtered.length === 0 && !error && (
              <Text className="py-6 text-center text-sm text-zinc-400">No doctors match.</Text>
            )}
          </ScrollView>
        )}
      </Screen>
    </>
  );
}
