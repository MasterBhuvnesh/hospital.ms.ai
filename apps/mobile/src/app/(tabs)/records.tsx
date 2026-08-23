import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { router, Stack } from "expo-router";
import { ChevronRight, Upload, ShieldAlert, Activity, Pill } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { Screen, Card } from "@/components/ui";
import { useAlert } from "@/components/CustomAlert";
import { api } from "@/lib/api";
import * as FileSystem from "expo-file-system/legacy";

export default function Records() {
  const alert = useAlert();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [conditions, setConditions] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [rxCount, setRxCount] = useState(0);
  
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      let me = await api.clinical.me();
      if (!me) {
        const u = await api.auth.me();
        me = await api.clinical.createSelf({
          fullName: u.fullName,
          email: u.email ?? undefined,
          phone: u.phone ?? undefined,
        });
      }
      setPatientId(me.id);
      const [a, c, m, l, rx] = await Promise.all([
        api.clinical.allergies(me.id),
        api.clinical.conditions(me.id),
        api.clinical.medications(me.id),
        api.clinical.labOrders(me.id),
        api.clinical.prescriptions(me.id),
      ]);
      setAllergies(a);
      setConditions(c.filter((x: any) => x.active));
      setMedications(m.filter((x: any) => x.active));
      setLabs(l.filter((x: any) => x.status === "RELEASED"));
      setRxCount(rx.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load records");
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }, [load]);

  function upload() {
    if (!patientId) return;
    DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true })
      .then(async (res) => {
        if (res.canceled || !res.assets[0]) return;
        const asset = res.assets[0];
        if ((asset.size ?? 0) > 8 * 1024 * 1024) {
          alert.show({ title: "File too large", message: "Please pick a file under 8 MB." });
          return;
        }
        setUploading(true);
        const dataBase64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        await api.clinical.uploadDocument({
          patientId,
          fileName: asset.name ?? "document",
          contentType: asset.mimeType ?? "application/octet-stream",
          label: asset.name ?? undefined,
          dataBase64,
        });
        alert.show({ title: "Uploaded", message: `${asset.name} is now in your records.` });
      })
      .catch((e) => alert.show({ title: "Upload failed", message: e instanceof Error ? e.message : String(e) }))
      .finally(() => setUploading(false));
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen title="Records" subtitle="Your medical history, all in one place" error={error}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#208AEF" />}
        >
          <View className="mb-4 flex-row gap-2.5">
            <TouchableOpacity
              onPress={upload}
              disabled={uploading}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
            >
              <Upload size={16} color="#fff" />
              <Text className="text-xs font-bold text-white">{uploading ? "Uploading…" : "Upload document"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/prescriptions")}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3"
            >
              <Pill size={16} color="#208AEF" />
              <Text className="text-xs font-bold text-zinc-700">Rx ({rxCount})</Text>
            </TouchableOpacity>
          </View>

          <Group
            title="ALLERGIES"
            icon={<ShieldAlert size={14} color="#dc2626" />}
            items={allergies.map((a: any) => ({
              key: a.id,
              main: `${a.substance} (${a.severity})`,
              sub: a.reaction ?? "",
              danger: a.severity === "SEVERE",
            }))}
            empty="No known allergies"
          />
          <Group
            title="CONDITIONS"
            icon={<Activity size={14} color="#d97706" />}
            items={conditions.map((c: any) => ({ key: c.id, main: c.name, sub: c.since ? `Since ${c.since}` : "" }))}
            empty="No chronic conditions"
          />
          <Group
            title="CURRENT MEDICATIONS"
            icon={<Pill size={14} color="#9333ea" />}
            items={medications.map((m: any) => ({ key: m.id, main: `${m.drug} · ${m.dose}`, sub: m.frequency }))}
            empty="No active medications"
          />

          <Text className="mb-2 mt-5 text-xs font-bold tracking-widest text-zinc-400">LAB RESULTS (RELEASED)</Text>
          {labs.length === 0 ? (
            <Card className="p-4">
              <Text className="text-xs text-zinc-400">No released results yet.</Text>
            </Card>
          ) : (
            labs.slice(0, 5).map((l: any) => (
              <Card key={l.id} className="mb-2.5 p-4">
                <View className="flex-row justify-between">
                  <Text className="text-sm font-bold text-zinc-900">{l.tests.map((t: any) => t.name).join(", ")}</Text>
                  <Text className="text-[10px] text-zinc-400">{l.releasedAt?.slice(0, 10)}</Text>
                </View>
                {(l.results ?? []).slice(0, 4).map((r: any, i: number) => (
                  <View key={i} className="mt-1.5 flex-row justify-between">
                    <Text className="text-xs text-zinc-600">{r.parameter}</Text>
                    <Text className={`text-xs font-semibold ${r.flag === "CRITICAL" ? "text-red-600" : "text-zinc-800"}`}>
                      {r.value} {r.unit ?? ""}
                    </Text>
                  </View>
                ))}
              </Card>
            ))
          )}
        </ScrollView>
      </Screen>
    </>
  );
}

function Group({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: { key: string; main: string; sub: string; danger?: boolean }[];
  empty: string;
}) {
  return (
    <>
      <View className="mb-2 mt-5 flex-row items-center gap-1.5">
        {icon}
        <Text className="text-xs font-bold tracking-widest text-zinc-400">{title}</Text>
        <Text className="text-[10px] font-bold text-zinc-300">{items.length}</Text>
      </View>
      {items.length === 0 ? (
        <Card className="p-3.5">
          <Text className="text-xs text-zinc-400">{empty}</Text>
        </Card>
      ) : (
        items.map((it) => (
          <Card key={it.key} className="mb-2 p-3.5">
            <View className="flex-row items-center justify-between">
              <Text className={`text-sm ${it.danger ? "font-bold text-red-600" : "font-semibold text-zinc-800"}`}>
                {it.main}
              </Text>
              <ChevronRight size={14} color="#e4e4e7" />
            </View>
            {it.sub ? <Text className="mt-0.5 text-xs text-zinc-500">{it.sub}</Text> : null}
          </Card>
        ))
      )}
    </>
  );
}
