import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Screen, Card } from "@/components/ui";
import { api } from "@/lib/api";

const CHANNELS = ["INAPP", "EMAIL", "SMS", "WHATSAPP", "PUSH"] as const;
const CATEGORIES: { key: string; label: string; locked?: boolean; hint: string }[] = [
  { key: "SECURITY", label: "Security & OTP", locked: true, hint: "Always SMS - the one channel that always reaches you" },
  { key: "QUEUE", label: "Queue updates", hint: "Near-turn, your turn, missed turn" },
  { key: "APPOINTMENT", label: "Appointments", hint: "Confirmations and reminders" },
  { key: "DOCUMENT", label: "Documents", hint: "Prescriptions, lab results" },
  { key: "BILLING", label: "Billing", hint: "Invoices, payments, refunds" },
  { key: "ALERT", label: "Hospital alerts", hint: "Operational notices" },
];

export default function Preferences() {
  const [prefs, setPrefs] = useState<Record<string, string[]>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPrefs(await api.comms.preferences());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load preferences");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(category: string, channel: string) {
    if (category === "SECURITY") return;
    if (channel === "INAPP") return;
    setPrefs((p) => {
      const current = p[category] ?? [];
      const next = current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel];
      return { ...p, [category]: next.length ? next : ["INAPP"] };
    });
    setDirty(true);
  }

  function save() {
    setSaving(true);
    api.comms
      .savePreferences(prefs)
      .then(() => router.back())
      .catch((e) => setError(e instanceof Error ? e.message : "Save failed"))
      .finally(() => setSaving(false));
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View className="flex-row items-center px-5 pb-1 pt-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10 }}>
            <ArrowLeft size={22} color="#3f3f46" />
          </TouchableOpacity>
          <Text className="ml-3 text-lg font-bold text-zinc-900">Notification preferences</Text>
        </View>
        <ScrollView contentContainerClassName="px-5 pb-10" >
          {error && (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-xs leading-4 text-red-600">{error}</Text>
            </View>
          )}
          <Card className="mb-4 p-4">
            <Text className="text-[11px] leading-4 text-zinc-500">
              In-app is always on. PUSH needs the app installed with notifications allowed - until then queue
              events fall back to SMS automatically.
            </Text>
          </Card>

          {CATEGORIES.map((cat) => {
            const active = prefs[cat.key] ?? [];
            return (
              <View key={cat.key} className="mb-4">
                <View className="mb-2 flex-row items-baseline justify-between">
                  <Text className="text-sm font-bold text-zinc-900">{cat.label}</Text>
                  {cat.locked && <Text className="text-[9px] font-bold tracking-wide text-zinc-400">LOCKED</Text>}
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {CHANNELS.map((ch) => {
                    const isOn = active.includes(ch);
                    const disabled = cat.locked || ch === "INAPP";
                    return (
                      <TouchableOpacity
                        key={ch}
                        onPress={() => toggle(cat.key, ch)}
                        disabled={disabled}
                        className={`rounded-full px-3 py-1.5 ${
                          isOn ? "bg-primary" : disabled ? "bg-zinc-100" : "border border-zinc-200 bg-white"
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            isOn ? "text-white" : disabled ? "text-zinc-300" : "text-zinc-600"
                          }`}
                        >
                          {ch}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text className="mt-1.5 text-[11px] text-zinc-400">{cat.hint}</Text>
              </View>
            );
          })}

          <TouchableOpacity
            onPress={save}
            disabled={!dirty || saving}
            className={`items-center rounded-xl py-4 ${!dirty || saving ? "bg-zinc-300" : "bg-primary"}`}
          >
            <Text className="text-[15px] font-bold text-white">{saving ? "Saving…" : dirty ? "Save preferences" : "No changes"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Screen>
    </>
  );
}
