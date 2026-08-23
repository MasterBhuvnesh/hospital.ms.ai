import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Linking, Share } from "react-native";
import { router, Stack } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ArrowLeft, Download, Eye, Share2, CheckCircle2 } from "lucide-react-native";
import { Screen, Card, Badge } from "@/components/ui";
import { useAlert } from "@/components/CustomAlert";
import { api, type Prescription } from "@/lib/api";
import {
  getSavedFiles,
  saveFileMeta,
  removeFileMeta,
  type SavedFile,
} from "@/lib/storage";

export default function Prescriptions() {
  const alert = useAlert();
  const [items, setItems] = useState<Prescription[]>([]);
  const [saved, setSaved] = useState<SavedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      let me = await api.clinical.me();
      if (!me) {
        const u = await api.auth.me();
        me = await api.clinical.createSelf({ fullName: u.fullName });
      }
      const [rx, files] = await Promise.all([api.clinical.prescriptions(me.id), getSavedFiles()]);
      setItems(rx.filter((p) => p.status !== "DRAFT"));
      setSaved(files);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load prescriptions");
    }
  }, []);

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  const urlOf = (p: Prescription) => p.downloadUrl ?? p.pdfUrl;
  const localOf = (p: Prescription) => saved.find((f) => f.prescriptionId === p.id)?.localUri ?? null;

  function openPdf(p: Prescription) {
    const url = urlOf(p);
    if (!url) {
      alert.show({ title: "No PDF", message: "This prescription has no rendered PDF." });
      return;
    }
    Linking.openURL(url).catch(() =>
      alert.show({ title: "Could not open", message: "No PDF viewer available for this link." }),
    );
  }

  async function downloadPdf(p: Prescription) {
    const url = urlOf(p);
    if (!url) return;
    setBusyId(p.id);
    try {
      const dest = new File(Paths.document, `rx-${p.id}.pdf`);
      await File.downloadFileAsync(url, dest, { idempotent: true });
      await saveFileMeta({
        prescriptionId: p.id,
        title: `Rx ${p.signedAt?.slice(0, 10) ?? ""}`,
        localUri: dest.uri,
        downloadedAt: new Date().toISOString(),
      });
      setSaved(await getSavedFiles());
      alert.show({ title: "Saved", message: "Prescription PDF saved on this device." });
    } catch (e) {
      alert.show({ title: "Download failed", message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyId(null);
    }
  }

  async function sharePdf(p: Prescription) {
    const local = localOf(p);
    if (local && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(local, { mimeType: "application/pdf", dialogTitle: "Share prescription" });
      return;
    }
    const url = urlOf(p);
    if (url) await Share.share({ message: `My prescription: ${url}` });
  }

  async function deleteSaved(p: Prescription) {
    await removeFileMeta(p.id);
    setSaved((files) => files.filter((f) => f.prescriptionId !== p.id));
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View className="flex-row items-center px-5 pb-1 pt-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10 }}>
            <ArrowLeft size={22} color="#3f3f46" />
          </TouchableOpacity>
          <Text className="ml-3 text-lg font-bold text-zinc-900">Prescriptions</Text>
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
          {error && (
            <View className="mb-3 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-xs leading-4 text-red-600">{error}</Text>
            </View>
          )}
          {loading ? (
            <Text className="py-6 text-center text-sm text-zinc-400">Loading…</Text>
          ) : items.length === 0 ? (
            <Text className="mt-20 px-6 text-center text-sm leading-5 text-zinc-500">
              No signed prescriptions yet. They appear here after a doctor signs one during a consultation.
            </Text>
          ) : (
            items.map((p) => (
              <Card key={p.id} className="mb-3 p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-bold text-zinc-900">
                      Dr. {p.doctorSnapshot?.name?.replace(/^Dr\.\s*/, "") ?? "Doctor"}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-zinc-400">
                      {p.signedAt?.slice(0, 10)} · reg. {p.doctorSnapshot?.registrationNumber ?? "-"}
                    </Text>
                  </View>
                  <Badge label={p.status === "DISPENSED" ? "DISPENSED" : "SIGNED"} />
                </View>

                <View className="mt-2.5 rounded-xl bg-zinc-50 p-3">
                  {(p.items ?? []).map((it, i) => (
                    <View key={i} className="mb-1 flex-row justify-between">
                      <Text className="flex-1 pr-2 text-xs font-semibold text-zinc-700">{it.drug}</Text>
                      <Text className="text-[11px] text-zinc-500">
                        {it.dose} · {it.frequency} · {it.durationDays}d
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="mt-3 flex-row items-center gap-4 border-t border-zinc-100 pt-3">
                  {saved.find((f) => f.prescriptionId === p.id) ? (
                    <TouchableOpacity onPress={() => deleteSaved(p)} className="flex-row items-center gap-1">
                      <CheckCircle2 size={15} color="#16a34a" />
                      <Text className="text-xs font-bold text-green-600">Saved</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity disabled={busyId === p.id} onPress={() => downloadPdf(p)} className="flex-row items-center gap-1">
                      <Download size={15} color="#208AEF" />
                      <Text className={`text-xs font-bold ${busyId === p.id ? "text-primary/50" : "text-primary"}`}>
                        {busyId === p.id ? "Saving…" : "Save"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => openPdf(p)} className="flex-row items-center gap-1">
                    <Eye size={15} color="#3f3f46" />
                    <Text className="text-xs font-bold text-zinc-700">Open PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => sharePdf(p)} className="ml-auto flex-row items-center gap-1">
                    <Share2 size={15} color="#a1a1aa" />
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      </Screen>
    </>
  );
}
