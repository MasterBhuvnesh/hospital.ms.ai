import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import { Screen, Card } from "@/components/ui";
import { SlotPicker } from "@/components/SlotPicker";
import { useAlert } from "@/components/CustomAlert";
import { api, type Doctor, type Hospital } from "@/lib/api";

export default function Book() {
  const alert = useAlert();
  const [step, setStep] = useState(0);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useLocalSearchParams<{ doctorId?: string }>();
  const preselectId = typeof params.doctorId === "string" ? params.doctorId : undefined;
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!preselectId || bootstrapped.current) return;
    bootstrapped.current = true;
    Promise.all([api.directory.doctors(), api.directory.hospitals()])
      .then(([docs, hsps]) => {
        const doc = docs.find((d) => d.id === preselectId);
        if (!doc) {
          setError("We could not find that doctor.");
          return;
        }
        setDoctors(docs);
        setHospitals(hsps);
        setHospitalId(doc.hospitalIds[0] ?? null);
        setDoctorId(doc.id);
        setStep(2);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load doctor"));
  }, [preselectId]);

  if (step === 0 && !preselectId && hospitals.length === 0 && !error) {
    api.directory
      .hospitals()
      .then(setHospitals)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load hospitals"));
  }
  if (step === 1 && doctors.length === 0) {
    api.directory
      .doctors(hospitalId ?? undefined)
      .then(setDoctors)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load doctors"));
  }

  const doctor = doctors.find((d) => d.id === doctorId);
  const filtered = doctors.filter((d) =>
    search ? d.fullName.toLowerCase().includes(search.toLowerCase()) || d.specializations.some((s) => s.toLowerCase().includes(search.toLowerCase())) : true,
  );

  function confirmBooking() {
    if (!doctorId || !startsAt) return;
    setBusy(true);
    api.scheduling
      .bookAppointment({ doctorId, startsAt, reason: reason.trim() || undefined })
      .then((appt) => {
        alert.show({
          title: "Appointment booked",
          message: "Do you want a queue token now?",
          buttons: [
            {
              text: "Get token",
              onPress: () =>
                api.scheduling
                  .mintToken(appt.id)
                  .then((t) => router.replace(`/queue/${t.id}`))
                  .catch(() => router.replace("/(tabs)")),
            },
            { text: "Later", style: "cancel", onPress: () => router.replace("/(tabs)") },
          ],
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Booking failed"))
      .finally(() => setBusy(false));
  }

  const stepTitles = ["Choose hospital", "Choose doctor", "Pick a time", "Confirm"];
  const hospital = hospitals.find((h) => h.id === hospitalId);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View className="flex-row items-center px-5 pb-2 pt-3">
          {step > 0 && (
            <TouchableOpacity
              onPress={() => setStep(step - 1)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={22} color="#3f3f46" />
            </TouchableOpacity>
          )}
          <Text className="ml-3 text-lg font-bold text-zinc-900">{stepTitles[step]}</Text>
        </View>

        <View className="flex-row gap-1.5 px-5 pt-1">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-zinc-200"}`} />
          ))}
        </View>

        {error && (
          <View className="mx-5 mt-4 rounded-xl bg-red-50 px-4 py-3">
            <Text className="text-xs leading-4 text-red-600">{error}</Text>
          </View>
        )}

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? undefined : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerClassName="px-5 pb-8">
            {step === 0 &&
              hospitals.map((h) => (
                <Card key={h.id} className="mb-2.5 p-4">
                  <TouchableOpacity
                    onPress={() => {
                      setHospitalId(h.id);
                      setStep(1);
                    }}
                    className="flex-row items-center justify-between"
                  >
                    <View>
                      <Text className="font-bold text-zinc-900">{h.name}</Text>
                      <Text className="mt-0.5 text-xs text-zinc-500">{h.city}</Text>
                    </View>
                    <ChevronRightIcon />
                  </TouchableOpacity>
                </Card>
              ))}

            {step === 1 && (
              <>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search name or specialization"
                  placeholderTextColor="#a1a1aa"
                  className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[15px] text-zinc-900"
                />
                {filtered.map((d) => (
                  <Card key={d.id} className="mb-2.5 p-4">
                    <TouchableOpacity
                      onPress={() => {
                        setDoctorId(d.id);
                        setStep(2);
                      }}
                      className="flex-row items-center justify-between"
                    >
                      <View className="flex-1 pr-2">
                        <Text className="font-bold text-zinc-900">{d.fullName}</Text>
                        <Text className="mt-0.5 text-xs text-zinc-500">
                          {d.specializations.join(", ")} · {d.feeConfig.amount} {d.feeConfig.currency}
                        </Text>
                        {d.experienceYears != null && (
                          <Text className="text-[11px] text-zinc-400">
                            {d.experienceYears} yrs exp · {d.registrationNumber ?? ""}
                          </Text>
                        )}
                      </View>
                      <ChevronRightIcon />
                    </TouchableOpacity>
                  </Card>
                ))}
                {filtered.length === 0 && !error && (
                  <Text className="py-6 text-center text-sm text-zinc-400">No doctors match.</Text>
                )}
              </>
            )}

            {step === 2 && doctor && (
              <>
                <Card className="mb-4 p-4">
                  <Text className="font-bold text-zinc-900">{doctor.fullName}</Text>
                  <Text className="mt-0.5 text-xs text-zinc-500">
                    {hospital?.name} · {doctor.feeConfig.amount} {doctor.feeConfig.currency}
                  </Text>
                </Card>
                <SlotPicker doctorId={doctor.id} value={startsAt} onSelect={(iso) => setStartsAt(iso)} />
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Reason for visit (optional)"
                  placeholderTextColor="#a1a1aa"
                  multiline
                  className="mt-4 min-h-[70px] rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[15px] text-zinc-900"
                />
              </>
            )}

            {step === 3 && doctor && startsAt && (
              <Card className="p-5">
                <Row k="Doctor" v={doctor.fullName} />
                <Row k="Hospital" v={hospital?.name ?? "-"} />
                <Row
                  k="When"
                  v={new Date(startsAt).toLocaleString([], {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
                <Row k="Fee" v={`${doctor.feeConfig.amount} ${doctor.feeConfig.currency}`} />
                {reason ? <Row k="Reason" v={reason} /> : null}
                <View className="mt-3 rounded-xl bg-primary-soft px-4 py-3">
                  <Text className="text-[11px] leading-4 text-primary-dark">
                    Booking is protected with an idempotency key - a double tap can never create two visits.
                  </Text>
                </View>
              </Card>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {(step === 2 || step === 3) && (
          <View className="px-5 pb-6">
            {step === 2 ? (
              <PrimaryButton
                label={startsAt ? `Continue (${new Date(startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})` : "Select a slot"}
                disabled={!startsAt}
                onPress={() => setStep(3)}
              />
            ) : (
              <PrimaryButton label={busy ? "Booking…" : "Confirm booking"} disabled={busy} onPress={confirmBooking} icon={<Check size={16} color="#fff" />} />
            )}
          </View>
        )}
      </Screen>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View className="mb-2.5 flex-row justify-between">
      <Text className="text-xs font-semibold text-zinc-500">{k}</Text>
      <Text className="max-w-[60%] text-right text-xs font-semibold text-zinc-800">{v}</Text>
    </View>
  );
}

function ChevronRightIcon() {
  return <Text className="text-lg text-zinc-300">›</Text>;
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center gap-2 rounded-xl py-4 ${disabled ? "bg-zinc-300" : "bg-primary"}`}
    >
      {icon}
      <Text className="text-[15px] font-bold text-white">{label}</Text>
    </TouchableOpacity>
  );
}
