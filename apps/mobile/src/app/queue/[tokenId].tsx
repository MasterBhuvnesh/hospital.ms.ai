import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { ArrowLeft, MapPin, Timer, Radio } from "lucide-react-native";
import { Screen, Card, Badge } from "@/components/ui";
import { api, type Token } from "@/lib/api";
import { openTokenStream } from "@/lib/sse";

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
  const [liveMode, setLiveMode] = useState<"sse" | "poll">("sse");
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollOnce = useCallback(async () => {
    try {
      if (!tokenId) return;
      const t = await api.scheduling.token(tokenId);
      setToken(t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lost connection to the queue");
    }
  }, [tokenId]);

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let stream: { close: () => void } | null = null;

    pollOnce().finally(() => !cancelled && setLoading(false));

    function startPolling(ms: number) {
      setLiveMode("poll");
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = setInterval(() => pollOnce(), ms);
    }

    try {
      stream = openTokenStream(tokenId ?? "", {
        onSnapshot: () => {},
        onUpdate: () => pollOnce(),
        onError: () => {
          if (cancelled) return;
          startPolling(5000);
        },
      });
      // If no SSE event frames arrive within a few seconds the connection may
      // not have opened at all - fall back to polling to stay safe.
      fallbackTimer = setTimeout(() => {
        if (!cancelled) setLiveMode("sse");
      }, 4000);
    } catch {
      startPolling(5000);
    }

    return () => {
      cancelled = true;
      stream?.close();
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [tokenId, pollOnce]);

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
        <View className="flex-row items-center px-5 pb-2 pt-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10 }}>
            <ArrowLeft size={22} color="#3f3f46" />
          </TouchableOpacity>
          <Text className="ml-3 text-lg font-bold text-zinc-900">Live queue</Text>
          <View className="flex-1" />
          <View className="flex-row items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1">
            <Radio size={11} color="#16a34a" />
            <Text className="text-[10px] font-bold tracking-wide text-green-700">
              {liveMode === "sse" ? "REALTIME" : "POLLING 5s"}
            </Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#208AEF" />
          </View>
        ) : !token ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-zinc-500">{error ?? "Token not found"}</Text>
          </View>
        ) : (
          <ScrollView contentContainerClassName="px-5 pb-10">
            {typeof token.position === "number" && token.position > 0 && token.position <= 3 && (
              <View className="mb-4 flex-row items-center rounded-xl bg-amber-50 px-4 py-3">
                <MapPin size={16} color="#d97706" />
                <Text className="ml-2 flex-1 text-xs font-semibold text-amber-700">
                  Almost your turn — please head over now
                </Text>
              </View>
            )}

            <Card className="mb-4 items-center py-7">
              <Text className="text-xs font-bold tracking-widest text-zinc-400">TOKEN</Text>
              <Text className="mt-1 text-[64px] font-bold leading-[72px] text-primary">#{token.tokenNumber}</Text>
              <Text className="text-sm font-semibold text-zinc-600">{token.doctorName}</Text>

              <View className="mt-3 flex-row items-center gap-2">
                <Badge label={token.priority} />
                {token.paymentStatus === "PAID" && <Badge label="PAID" />}
                {typeof token.position === "number" && token.position > 0 && <Badge label={`POS ${token.position}`} />}
              </View>
            </Card>

            {token.status === "WAITING" && typeof token.etaMinutes === "number" && (
              <Card className="mb-4 p-4">
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

            {error && <Text className="mb-3 text-center text-xs text-red-500">{error}</Text>}

            <Text className="mb-2 text-xs font-bold tracking-widest text-zinc-400">STATUS</Text>
            <Card className="p-4">
              {[...STEPS].map((step, i) => {
                const done = i <= stepIndex && stepIndex >= 0;
                const current = i === stepIndex;
                const skippedNow = stepIndex === -2 && i === 0 && token.status === "SKIPPED";
                return (
                  <View key={step} className="flex-row items-start">
                    <View className="mr-3 items-center">
                      <View
                        className={`h-5 w-5 items-center justify-center rounded-full ${
                          current || done || skippedNow ? "bg-primary" : "bg-zinc-200"
                        }`}
                      >
                        <View
                          className={`h-2 w-2 rounded-full ${
                            current || done || skippedNow ? "bg-white" : "bg-zinc-400"
                          }`}
                        />
                      </View>
                      {i < STEPS.length - 1 && <View className={`h-7 w-0.5 ${done ? "bg-primary" : "bg-zinc-200"}`} />}
                    </View>
                    <Text
                      className={`text-sm ${
                        current ? "font-bold text-zinc-900" : done ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      {skippedNow && token.status === "SKIPPED"
                        ? "Skipped — ask reception to recall you"
                        : STEP_LABEL[step]}
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
