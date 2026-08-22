import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { ArrowLeft, MapPin, Timer } from "lucide-react-native";
import { Screen, Card, Badge } from "@/components/ui";
import { api, type Token } from "@/lib/api";

const STEPS = ["WAITING", "CALLED", "IN_CONSULTATION", "COMPLETED"] as const;
const STEP_LABEL: Record<string, string> = {
  WAITING: "In queue",
  CALLED: "Called",
  IN_CONSULTATION: "With doctor",
  COMPLETED: "Done",
};

export default function LiveQueue() {
  const { tokenId } = useLocalSearchParams<{ tokenId: string }>();
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      if (!tokenId) return;
      const t = await api.token(tokenId);
      setToken(t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lost connection to the queue");
    }
  }, [tokenId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await poll();
      if (!cancelled) setLoading(false);
    })();
    timer.current = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [poll]);

  const stepIndex =
    token && STEPS.includes(token.status as (typeof STEPS)[number])
      ? STEPS.indexOf(token.status as (typeof STEPS)[number])
      : token?.status === "SKIPPED"
        ? -2
        : -1;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View className="flex-row items-center px-5 pt-3 pb-1">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft size={22} color="#3f3f46" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-zinc-900 ml-3">Live queue</Text>
          <View className="flex-1" />
          <View className="flex-row items-center">
            <View className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
            <Text className="text-[10px] text-zinc-400 font-semibold tracking-wide">LIVE · 5s</Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#208AEF" />
          </View>
        ) : !token ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-zinc-500 text-center">{error ?? "Token not found"}</Text>
          </View>
        ) : (
          <ScrollView contentContainerClassName="px-5 pb-10">
            {typeof token.position === "number" && token.position > 0 && token.position <= 3 && (
              <View className="bg-amber-50 rounded-xl px-4 py-3 mb-4 flex-row items-center">
                <MapPin size={16} color="#d97706" />
                <Text className="text-amber-700 text-xs font-semibold ml-2 flex-1">
                  Almost your turn — please head over now
                </Text>
              </View>
            )}

            <Card className="items-center py-7 mb-4">
              <Text className="text-xs font-bold text-zinc-400 tracking-widest">TOKEN</Text>
              <Text className="text-[64px] leading-[72px] font-bold text-primary mt-1">#{token.tokenNumber}</Text>
              <Text className="text-sm text-zinc-600 font-semibold">{token.doctorName}</Text>

              <View className="flex-row items-center gap-2 mt-3">
                <Badge label={token.priority} />
                {token.paymentStatus === "PAID" && <Badge label="PAID" />}
                {typeof token.position === "number" && token.position > 0 && (
                  <Badge label={`POS ${token.position}`} />
                )}
              </View>
            </Card>

            {token.status === "WAITING" && typeof token.etaMinutes === "number" && (
              <Card className="p-4 mb-4">
                <View className="flex-row items-center">
                  <Timer size={18} color="#208AEF" />
                  <View className="ml-2.5 flex-1">
                    <Text className="text-sm font-bold text-zinc-900">~{token.etaMinutes} min estimated wait</Text>
                    <Text className="text-xs text-zinc-500">
                      {typeof token.position === "number"
                        ? `${token.position} ${token.position === 1 ? "person is" : "people are"} ahead of you`
                        : ""}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {error && <Text className="text-red-500 text-xs text-center mb-3">{error}</Text>}

            <Text className="text-xs font-bold text-zinc-400 tracking-widest mb-2">STATUS</Text>
            <Card className="p-4">
              {[...STEPS].map((step, i) => {
                const done = i <= stepIndex && stepIndex >= 0;
                const current = i === stepIndex;
                const skippedNow = stepIndex === -2 && i === 0 && token.status === "SKIPPED";
                return (
                  <View key={step} className="flex-row items-start">
                    <View className="items-center mr-3">
                      <View
                        className={`w-5 h-5 rounded-full items-center justify-center ${
                          current || done || skippedNow ? "bg-primary" : "bg-zinc-200"
                        }`}
                      >
                        <View className={`w-2 h-2 rounded-full ${current || done || skippedNow ? "bg-white" : "bg-zinc-400"}`} />
                      </View>
                      {i < STEPS.length - 1 && (
                        <View className={`w-0.5 h-7 ${done ? "bg-primary" : "bg-zinc-200"}`} />
                      )}
                    </View>
                    <Text className={`text-sm ${current ? "font-bold text-zinc-900" : done ? "text-zinc-600" : "text-zinc-400"}`}>
                      {skippedNow && token.status === "SKIPPED" ? "Skipped — ask reception to recall you" : STEP_LABEL[step]}
                    </Text>
                  </View>
                );
              })}
            </Card>
          </ScrollView>
        )}
      </Screen>
    </>
  );
}
