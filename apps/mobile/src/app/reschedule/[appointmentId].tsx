import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Screen, Card } from "@/components/ui";
import { SlotPicker } from "@/components/SlotPicker";
import { useAlert } from "@/components/CustomAlert";
import { api } from "@/lib/api";
import { fmtDate, fmtTime } from "@/lib/format";

export default function Reschedule() {
  const alert = useAlert();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [current, setCurrent] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) return;
    api.scheduling
      .appointments()
      .then((items) => {
        const a = items.find((x) => x.id === appointmentId);
        if (a) {
          setDoctorId(a.doctorId);
          setCurrent(a.startsAt);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the appointment"));
  }, [appointmentId]);

  function save() {
    if (!appointmentId || !startsAt) return;
    setBusy(true);
    api.scheduling
      .reschedule(appointmentId, startsAt)
      .then(() => {
        alert.show({
          title: "Appointment moved",
          message: `${fmtDate(startsAt)} at ${fmtTime(startsAt)}`,
          buttons: [{ text: "OK", onPress: () => router.back() }],
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Reschedule failed"))
      .finally(() => setBusy(false));
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen title="Reschedule" subtitle={current ? `Currently ${fmtDate(current)} · ${fmtTime(current)}` : undefined} error={error}>
        <ScrollView contentContainerClassName="px-5 pb-8">
          {!doctorId ? (
            <Text className="py-6 text-center text-sm text-zinc-400">Loading…</Text>
          ) : (
            <>
              <Card className="mb-4 p-4">
                <Text className="text-xs leading-4 text-zinc-500">
                  {"Pick a new slot. The doctor's live availability is shown - booked slots are crossed out."}
                </Text>
              </Card>
              <SlotPicker doctorId={doctorId} onSelect={setStartsAt} />
            </>
          )}
        </ScrollView>
        {startsAt && (
          <View className="px-5 pb-6">
            <TouchableOpacity
              onPress={save}
              disabled={busy}
              className={`items-center rounded-xl py-4 ${busy ? "bg-primary/60" : "bg-primary"}`}
            >
              <Text className="text-[15px] font-bold text-white">
                {busy ? "Moving…" : `Move to ${fmtDate(startsAt)} · ${fmtTime(startsAt)}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Screen>
    </>
  );
}
