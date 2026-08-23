import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Screen, Card } from "@/components/ui";
import { useAlert } from "@/components/CustomAlert";
import { api } from "@/lib/api";
import * as FileSystem from "expo-file-system/legacy";

const GENDERS = ["FEMALE", "MALE", "OTHER"] as const;

export default function EditProfile() {
  const alert = useAlert();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    dob: "",
    gender: null as string | null,
    bloodGroup: "",
    phone: "",
    email: "",
    photoUrl: "" as string | null,
  });
  const [emergency, setEmergency] = useState({ name: "", phone: "" });
  const [insurance, setInsurance] = useState({ provider: "", number: "" });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let me = await api.clinical.me();
        if (!me) {
          const u = await api.auth.me();
          me = await api.clinical.createSelf({ fullName: u.fullName, email: u.email ?? undefined, phone: u.phone ?? undefined });
        }
        setPatientId(me.id);
        setForm({
          fullName: me.fullName ?? "",
          dob: me.dob ?? "",
          gender: me.gender ?? null,
          bloodGroup: me.bloodGroup ?? "",
          phone: me.phone ?? "",
          email: me.email ?? "",
          photoUrl: me.photoUrl ?? null,
        });
        setEmergency({ name: me.emergencyContact?.name ?? "", phone: me.emergencyContact?.phone ?? "" });
        setInsurance({ provider: me.insurance?.provider ?? "", number: me.insurance?.number ?? "" });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load profile");
      }
    })();
  }, []);

  function pickPhoto() {
    ImagePicker.launchImageLibraryAsync(
      { mediaTypes: ["images"], quality: 0.5, base64: true, allowsMultipleSelection: false } as any,
    )
      .then(async (res) => {
        if (res.canceled || !res.assets[0]?.base64 || !patientId) return;
        if ((res.assets[0].fileSize ?? 0) > 5 * 1024 * 1024) {
          alert.show({ title: "Image too large", message: "Please pick one under 5 MB." });
          return;
        }
        setUploading(true);
        try {
          const doc = await api.clinical.uploadDocument({
            patientId,
            fileName: `avatar-${Date.now()}.jpg`,
            contentType: "image/jpeg",
            label: "profile-photo",
            dataBase64: res.assets[0].base64!,
          });
          const url = doc.downloadUrl ?? doc.publicUrl;
          if (url) {
            setForm((f) => ({ ...f, photoUrl: url }));
            await api.clinical.update(patientId, { photoUrl: url });
          }
          alert.show({ title: "Photo updated" });
        } catch (e) {
          alert.show({ title: "Upload failed", message: e instanceof Error ? e.message : String(e) });
        } finally {
          setUploading(false);
        }
      })
      .catch(() => {});
    void FileSystem;
  }

  function save() {
    if (!patientId) return;
    if (!form.fullName.trim()) return setError("Name is required.");
    if (form.dob && !/^\d{4}-\d{2}-\d{2}$/.test(form.dob)) return setError("DOB must be YYYY-MM-DD.");
    setBusy(true);
    setError(null);
    api.clinical
      .update(patientId, {
        fullName: form.fullName.trim(),
        dob: form.dob || undefined,
        gender: (form.gender as any) ?? undefined,
        bloodGroup: form.bloodGroup || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        emergencyContact:
          emergency.name || emergency.phone
            ? { name: emergency.name || undefined, phone: emergency.phone || undefined }
            : null,
        insurance: insurance.provider && insurance.number ? insurance : null,
      })
      .then(() => alert.show({ title: "Saved", buttons: [{ text: "OK", onPress: () => router.back() }] }))
      .catch((e) => setError(e instanceof Error ? e.message : "Save failed"))
      .finally(() => setBusy(false));
  }

  function field(label: string, key: keyof typeof form, opts?: { keyboardType?: any; placeholder?: string }) {
    return (
      <View className="mb-3">
        <Text className="mb-1 text-[11px] font-bold tracking-wide text-zinc-400">{label.toUpperCase()}</Text>
        <TextInput
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[15px] text-zinc-900"
          keyboardType={opts?.keyboardType}
          placeholder={opts?.placeholder}
          placeholderTextColor="#a1a1aa"
          value={(form as any)[key] ?? ""}
          onChangeText={(t) => setForm((f) => ({ ...f, [key]: t }))}
        />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View className="flex-row items-center px-5 pb-1 pt-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10 }}>
            <ArrowLeft size={22} color="#3f3f46" />
          </TouchableOpacity>
          <Text className="ml-3 text-lg font-bold text-zinc-900">Edit profile</Text>
        </View>
        <ScrollView contentContainerClassName="px-5 pb-10">
          {error && (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-xs leading-4 text-red-600">{error}</Text>
            </View>
          )}

          <View className="mb-5 flex-row items-center gap-4">
            <TouchableOpacity onPress={pickPhoto} disabled={uploading}>
              {form.photoUrl ? (
                <Image source={{ uri: form.photoUrl }} style={{ width: 72, height: 72, borderRadius: 36 }} />
              ) : (
                <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft">
                  <Text className="text-xl font-bold text-primary-dark">+PHOTO</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text className="flex-1 text-xs leading-4 text-zinc-400">
              {uploading ? "Uploading…" : "Tap to choose a profile photo. Stored privately; only shared with doctors you grant."}
            </Text>
          </View>

          {field("Full name", "fullName")}
          {field("Date of birth", "dob", { placeholder: "YYYY-MM-DD", keyboardType: undefined })}
          {field("Blood group", "bloodGroup", { placeholder: "O+" })}
          {field("Phone", "phone", { keyboardType: "phone-pad" })}
          {field("Email", "email", { keyboardType: "email-address" })}

          <Text className="mb-2 mt-2 text-xs font-bold tracking-widest text-zinc-400">EMERGENCY CONTACT</Text>
          <Card className="p-4">
            <TextInput
              className="mb-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[14px] text-zinc-900"
              placeholder="Name"
              placeholderTextColor="#a1a1aa"
              value={emergency.name}
              onChangeText={(t) => setEmergency((s) => ({ ...s, name: t }))}
            />
            <TextInput
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[14px] text-zinc-900"
              placeholder="Phone"
              placeholderTextColor="#a1a1aa"
              keyboardType="phone-pad"
              value={emergency.phone}
              onChangeText={(t) => setEmergency((s) => ({ ...s, phone: t }))}
            />
          </Card>

          <Text className="mb-2 mt-5 text-xs font-bold tracking-widest text-zinc-400">INSURANCE</Text>
          <Card className="p-4">
            <TextInput
              className="mb-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[14px] text-zinc-900"
              placeholder="Provider"
              placeholderTextColor="#a1a1aa"
              value={insurance.provider}
              onChangeText={(t) => setInsurance((s) => ({ ...s, provider: t }))}
            />
            <TextInput
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[14px] text-zinc-900"
              placeholder="Policy number"
              placeholderTextColor="#a1a1aa"
              value={insurance.number}
              onChangeText={(t) => setInsurance((s) => ({ ...s, number: t }))}
            />
          </Card>

          <Text className="mb-2 mt-5 text-xs font-bold tracking-widest text-zinc-400">GENDER</Text>
          <View className="mb-6 flex-row gap-2">
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setForm((f) => ({ ...f, gender: g }))}
                className={`flex-1 items-center rounded-xl py-2.5 ${form.gender === g ? "bg-primary" : "bg-zinc-100"}`}
              >
                <Text className={`text-xs font-bold ${form.gender === g ? "text-white" : "text-zinc-600"}`}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={save}
            disabled={busy}
            className={`items-center rounded-xl py-4 ${busy ? "bg-primary/60" : "bg-primary"}`}
          >
            <Text className="text-[15px] font-bold text-white">{busy ? "Saving…" : "Save changes"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Screen>
    </>
  );
}
