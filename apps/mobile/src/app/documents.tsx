import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Linking } from "react-native";
import { router, Stack } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  ArrowLeft,
  FileText,
  Share2,
  Trash2,
  ExternalLink,
  Upload,
} from "lucide-react-native";
import { Screen, Card, Skeleton } from "@/components/ui";
import { useAlert } from "@/components/CustomAlert";
import { api, type PatientDocument } from "@/lib/api";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const alert = useAlert();
  const [docs, setDocs] = useState<PatientDocument[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
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
      setPatientId(me.id);
      setDocs(await api.clinical.documents(me.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load documents");
    }
  }, []);

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  async function upload() {
    const DocumentPicker = await import("expo-document-picker");
    const res = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets[0] || !patientId) return;
    const asset = res.assets[0];
    if ((asset.size ?? 0) > 8 * 1024 * 1024) {
      alert.show({ title: "File too large", message: "Please pick a file under 8 MB." });
      return;
    }
    setBusyId("upload");
    try {
      const dataBase64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await api.clinical.uploadDocument({
        patientId,
        fileName: asset.name ?? "document",
        contentType: asset.mimeType ?? "application/octet-stream",
        label: asset.name ?? undefined,
        dataBase64,
      });
      await load();
    } catch (e) {
      alert.show({ title: "Upload failed", message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyId(null);
    }
  }

  async function resolveUrl(doc: PatientDocument): Promise<string | null> {
    try {
      const fresh = await api.clinical.document(doc.id);
      return fresh.downloadUrl ?? fresh.publicUrl;
    } catch {
      return doc.publicUrl;
    }
  }

  function openDoc(doc: PatientDocument) {
    setBusyId(doc.id);
    resolveUrl(doc)
      .then((url) => {
        if (!url) throw new Error("No URL for this file.");
        Linking.openURL(url);
      })
      .catch((e) => alert.show({ title: "Could not open", message: e instanceof Error ? e.message : String(e) }))
      .finally(() => setBusyId(null));
  }

  function shareDoc(doc: PatientDocument) {
    setBusyId(doc.id);
    resolveUrl(doc)
      .then(async (url) => {
        if (!url) throw new Error("No URL for this file.");
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(url, { dialogTitle: doc.label });
        } else {
          await Linking.openURL(url);
        }
      })
      .catch((e) => alert.show({ title: "Share failed", message: e instanceof Error ? e.message : String(e) }))
      .finally(() => setBusyId(null));
  }

  function deleteDoc(doc: PatientDocument) {
    alert.show({
      title: "Delete document?",
      message: `${doc.label} will be removed permanently.`,
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setBusyId(doc.id);
            api.clinical
              .deleteDocument(doc.id)
              .then(load)
              .catch((e) => alert.show({ title: "Delete failed", message: e instanceof Error ? e.message : String(e) }))
              .finally(() => setBusyId(null));
          },
        },
      ],
    });
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View className="flex-row items-center px-5 pb-1 pt-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10 }}>
            <ArrowLeft size={22} color="#3f3f46" />
          </TouchableOpacity>
          <Text className="ml-3 flex-1 text-lg font-bold text-zinc-900">My documents</Text>
          <TouchableOpacity
            onPress={upload}
            disabled={busyId === "upload"}
            className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${busyId === "upload" ? "bg-primary/50" : "bg-primary"}`}
          >
            <Upload size={13} color="#fff" />
            <Text className="text-[11px] font-bold text-white">{busyId === "upload" ? "…" : "Add"}</Text>
          </TouchableOpacity>
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
            <>
              <Skeleton className="mb-3 h-16" />
              <Skeleton className="mb-3 h-16" />
              <Skeleton className="h-16" />
            </>
          ) : docs.length === 0 ? (
            <View className="mt-20 items-center">
              <FileText size={40} color="#e4e4e7" />
              <Text className="mt-3 text-sm text-zinc-500">No documents uploaded</Text>
              <Text className="mt-1 px-8 text-center text-xs leading-4 text-zinc-400">
                Reports, scans and prescriptions you upload appear here - private until you grant access.
              </Text>
            </View>
          ) : (
            docs.map((doc) => (
              <Card key={doc.id} className="mb-2.5 p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-start gap-3 pr-2">
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary-soft">
                      <FileText size={17} color="#208AEF" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-zinc-900" numberOfLines={1}>
                        {doc.label}
                      </Text>
                      <Text className="mt-0.5 text-[11px] text-zinc-400">
                        {doc.fileName} · {fmtSize(doc.sizeBytes)} · {doc.createdAt?.slice(0, 10)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="mt-3 flex-row items-center gap-5 border-t border-zinc-100 pt-2.5">
                  <TouchableOpacity disabled={busyId === doc.id} onPress={() => openDoc(doc)} className="flex-row items-center gap-1">
                    <ExternalLink size={14} color="#208AEF" />
                    <Text className="text-xs font-bold text-primary">Open</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={busyId === doc.id} onPress={() => shareDoc(doc)} className="flex-row items-center gap-1">
                    <Share2 size={14} color="#71717a" />
                    <Text className="text-xs font-bold text-zinc-600">Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={busyId === doc.id} onPress={() => deleteDoc(doc)} className="ml-auto flex-row items-center gap-1">
                    {busyId === doc.id ? (
                      <Text className="text-xs font-bold text-red-300">Working…</Text>
                    ) : (
                      <>
                        <Trash2 size={14} color="#dc2626" />
                        <Text className="text-xs font-bold text-red-500">Delete</Text>
                      </>
                    )}
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
