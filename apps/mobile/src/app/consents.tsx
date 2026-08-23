import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, Check, ChevronDown, Handshake } from "lucide-react-native";
import { Screen, Card } from "@/components/ui";
import { useAlert } from "@/components/CustomAlert";
import { api, type ConsentRow, type Doctor } from "@/lib/api";

const SCOPES = ["RECORDS", "LABS", "PRESCRIPTIONS"] as const;
type Scope = (typeof SCOPES)[number];

const EXPIRY_OPTIONS = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
] as const;

function shortUser(id: string) {
  return `User ${id.slice(0, 8)}`;
}

export default function Consents() {
  const alert = useAlert();
  const [given, setGiven] = useState<ConsentRow[]>([]);
  const [received, setReceived] = useState<ConsentRow[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [pickedDoctor, setPickedDoctor] = useState<Doctor | null>(null);
  const [scopes, setScopes] = useState<Scope[]>(["RECORDS"]);
  const [expiryDays, setExpiryDays] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [mine, docs] = await Promise.all([api.clinical.consentsMine(), api.directory.doctors()]);
      setGiven(mine.given.filter((c) => !c.revokedAt));
      setReceived(mine.received.filter((c) => !c.revokedAt));
      setDoctors(docs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load consents");
    }
  }, []);

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  const nameByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of doctors) if (d.userId) map[d.userId] = d.fullName;
    return map;
  }, [doctors]);

  const candidates = useMemo(() => doctors.filter((d) => !!d.userId), [doctors]);

  function toggleScope(s: Scope) {
    setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function openForm() {
    setFormOpen(true);
    setPickOpen(false);
    setPickedDoctor(null);
    setScopes(["RECORDS"]);
    setExpiryDays(null);
  }

  function confirmRevoke(row: ConsentRow) {
    alert.show({
      title: "Revoke access?",
      message: `${nameByUserId[row.grantToUserId] ?? shortUser(row.grantToUserId)} will immediately lose access to your ${row.scope.join(", ").toLowerCase()} records.`,
      buttons: [
        { text: "Keep access", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: () =>
            api.clinical
              .revokeConsent(row.id)
              .then(load)
              .catch((e) => setError(e instanceof Error ? e.message : "Revoke failed")),
        },
      ],
    });
  }

  function submitGrant() {
    if (!pickedDoctor?.userId || scopes.length === 0) return;
    setBusy(true);
    api.clinical.grantConsent({
      grantToUserId: pickedDoctor.userId,
      scope: scopes,
      expiresAt: expiryDays ? new Date(Date.now() + expiryDays * 86_400_000).toISOString() : undefined,
    })
      .then(() => {
        setFormOpen(false);
        return load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not grant access"))
      .finally(() => setBusy(false));
  }

  function ScopeChips({ items }: { items: string[] }) {
    return (
      <View className="mt-2 flex-row flex-wrap gap-1.5">
        {items.map((s) => (
          <View key={s} className="rounded-full bg-primary-soft px-2.5 py-1">
            <Text className="text-[10px] font-bold text-primary-dark">{s}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen error={error}>
        <View className="flex-row items-center px-5 pb-1 pt-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10 }}>
            <ArrowLeft size={22} color="#3f3f46" />
          </TouchableOpacity>
          <Text className="ml-3 text-lg font-bold text-zinc-900">Doctor access &amp; consents</Text>
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
          {!loading && !formOpen && (
            <TouchableOpacity
              onPress={openForm}
              className="mb-4 mt-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5"
            >
              <Handshake size={16} color="#fff" />
              <Text className="text-sm font-bold text-white">Grant access</Text>
            </TouchableOpacity>
          )}

          {formOpen && (
            <Card className="mb-4 p-4">
              <Text className="text-sm font-bold text-zinc-900">Share your records with a doctor</Text>

              <Text className="mb-1.5 mt-3 text-[11px] font-bold tracking-widest text-zinc-400">DOCTOR</Text>
              <TouchableOpacity
                onPress={() => setPickOpen(!pickOpen)}
                className="flex-row items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"
              >
                <Text className={`text-[15px] ${pickedDoctor ? "text-zinc-900" : "text-zinc-400"}`}>
                  {pickedDoctor?.fullName ?? "Pick a doctor"}
                </Text>
                <ChevronDown size={16} color="#a1a1aa" />
              </TouchableOpacity>
              {pickOpen && (
                <View className="mt-2 max-h-[220px] overflow-hidden rounded-xl border border-zinc-100 bg-white">
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {candidates.map((d) => (
                      <TouchableOpacity
                        key={d.id}
                        onPress={() => {
                          setPickedDoctor(d);
                          setPickOpen(false);
                        }}
                        className="flex-row items-center justify-between border-b border-zinc-50 px-4 py-2.5"
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-sm font-semibold text-zinc-800">{d.fullName}</Text>
                          <Text className="text-[11px] text-zinc-400">{d.specializations.join(", ") || "General"}</Text>
                        </View>
                        {pickedDoctor?.id === d.id && <Check size={16} color="#208AEF" />}
                      </TouchableOpacity>
                    ))}
                    {candidates.length === 0 && (
                      <Text className="px-4 py-3 text-xs text-zinc-400">No doctors available.</Text>
                    )}
                  </ScrollView>
                </View>
              )}

              <Text className="mb-1.5 mt-4 text-[11px] font-bold tracking-widest text-zinc-400">SCOPE</Text>
              <View className="flex-row gap-2">
                {SCOPES.map((s) => {
                  const on = scopes.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => toggleScope(s)}
                      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
                        on ? "border-primary bg-primary-soft" : "border-zinc-200 bg-white"
                      }`}
                    >
                      <View
                        className={`h-3.5 w-3.5 items-center justify-center rounded ${on ? "bg-primary" : "border border-zinc-300 bg-white"}`}
                      >
                        {on && <Check size={10} color="#fff" />}
                      </View>
                      <Text className={`text-xs font-semibold ${on ? "text-primary-dark" : "text-zinc-500"}`}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="mb-1.5 mt-4 text-[11px] font-bold tracking-widest text-zinc-400">EXPIRY (OPTIONAL)</Text>
              <View className="flex-row gap-2">
                {EXPIRY_OPTIONS.map((o) => {
                  const on = expiryDays === o.days;
                  return (
                    <TouchableOpacity
                      key={o.days}
                      onPress={() => setExpiryDays(on ? null : o.days)}
                      className={`rounded-full px-4 py-2 ${on ? "bg-primary" : "bg-zinc-100"}`}
                    >
                      <Text className={`text-xs font-bold ${on ? "text-white" : "text-zinc-600"}`}>{o.label}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity onPress={() => setExpiryDays(null)} className="rounded-full bg-zinc-100 px-4 py-2">
                  <Text className="text-xs font-bold text-zinc-600">Never</Text>
                </TouchableOpacity>
              </View>

              <View className="mt-4 flex-row gap-2.5">
                <TouchableOpacity
                  onPress={() => setFormOpen(false)}
                  className="flex-1 items-center rounded-xl border border-zinc-200 py-3"
                >
                  <Text className="text-sm font-bold text-zinc-600">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={busy || !pickedDoctor || scopes.length === 0}
                  onPress={submitGrant}
                  className={`flex-[2] items-center rounded-xl py-3 ${
                    busy || !pickedDoctor || scopes.length === 0 ? "bg-zinc-300" : "bg-primary"
                  }`}
                >
                  <Text className="text-sm font-bold text-white">{busy ? "Granting…" : "Grant access"}</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {loading ? (
            <Text className="py-6 text-center text-sm text-zinc-400">Loading…</Text>
          ) : (
            <>
              <Text className="mb-2 text-xs font-bold tracking-widest text-zinc-400">
                GRANTED BY ME ({given.length})
              </Text>
              {given.length === 0 ? (
                <Card className="p-4">
                  <Text className="text-xs text-zinc-400">You have not shared access with any doctor.</Text>
                </Card>
              ) : (
                given.map((c) => (
                  <Card key={c.id} className="mb-2.5 p-4">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        <Text className="font-bold text-zinc-900">
                          {nameByUserId[c.grantToUserId] ?? shortUser(c.grantToUserId)}
                        </Text>
                        <Text className="mt-0.5 text-[11px] text-zinc-400">
                          {c.expiresAt ? `expires ${c.expiresAt.slice(0, 10)}` : "no expiry"} · granted{" "}
                          {c.createdAt.slice(0, 10)}
                        </Text>
                        <ScopeChips items={c.scope} />
                      </View>
                      <TouchableOpacity onPress={() => confirmRevoke(c)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text className="text-[11px] font-bold text-red-500">REVOKE</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}

              <Text className="mb-2 mt-5 text-xs font-bold tracking-widest text-zinc-400">
                GRANTED TO ME ({received.length})
              </Text>
              {received.length === 0 ? (
                <Card className="p-4">
                  <Text className="text-xs text-zinc-400">No doctor has shared their notes with you.</Text>
                </Card>
              ) : (
                received.map((c) => (
                  <Card key={c.id} className="mb-2.5 p-4">
                    <Text className="font-bold text-zinc-900">
                      {nameByUserId[c.grantorUserId] ?? shortUser(c.grantorUserId)}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-zinc-400">
                      {c.expiresAt ? `expires ${c.expiresAt.slice(0, 10)}` : "no expiry"}
                    </Text>
                    <ScopeChips items={c.scope} />
                  </Card>
                ))
              )}
            </>
          )}
        </ScrollView>
      </Screen>
    </>
  );
}
