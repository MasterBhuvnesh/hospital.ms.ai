import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
import { router, Stack } from "expo-router";
import { Image } from "expo-image";
import {
  LogOut,
  Mail,
  ShieldCheck,
  ChevronRight,
  UserCog,
  Bell,
  Wallet,
  FileText,
  Smartphone,
  KeyRound,
} from "lucide-react-native";
import { Screen, Card } from "@/components/ui";import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/components/CustomAlert";
import { api, type PatientRecord, type DeviceRow } from "@/lib/api";

export default function Profile() {
  const alert = useAlert();
  const { user, signOut } = useAuth();
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [minSupported, setMinSupported] = useState<string | null>(null);

  const load = useCallback(() => {
    api.clinical.me().then(setPatient).catch(() => {});
    api.auth.devices().then(setDevices).catch(() => {});
    api.config.app().then((c) => setMinSupported(c.minSupportedVersion)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function confirmSignOut() {
    alert.show({
      title: "Sign out?",
      message: "You will need to sign in again to see your visits.",
      buttons: [
        { text: "Stay", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: () => signOut() },
      ],
    });
  }

  function revokeDevice(d: DeviceRow) {
    if (d.platform === Platform.OS) {
      alert.show({ title: "This device", message: "Signing out is how you revoke the device you are holding." });
      return;
    }
    api.auth
      .revokeDevice(d.deviceId)
      .then(load)
      .catch(() => alert.show({ title: "Could not revoke", message: "Try again." }));
  }

  const rows = [
    { icon: UserCog, label: "Edit profile & health details", onPress: () => router.push("/edit-profile") },
    { icon: Bell, label: "Notification preferences", onPress: () => router.push("/preferences") },
    { icon: KeyRound, label: "Doctor access & consents", onPress: () => router.push("/consents") },
    { icon: Wallet, label: "Bills & payments", onPress: () => router.push("/payments") },
    { icon: FileText, label: "Prescriptions", onPress: () => router.push("/prescriptions") },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen title="Profile">
        <ScrollView contentContainerClassName="px-5 pb-8">
          <View className="mb-6 mt-2 items-center">
            <TouchableOpacity onPress={() => router.push("/edit-profile")}>
              {patient?.photoUrl ? (
                <Image source={{ uri: patient.photoUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
                  <Text className="text-2xl font-bold text-primary-dark">
                    {(user?.fullName ?? "A")
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <Text className="mt-3 text-lg font-bold text-zinc-900">{user?.fullName}</Text>
            {user?.email && (
              <View className="mt-1 flex-row items-center">
                <Mail size={12} color="#a1a1aa" />
                <Text className="ml-1 text-xs text-zinc-500">{user.email}</Text>
              </View>
            )}
            {user?.phone && <Text className="mt-0.5 text-xs text-zinc-500">{user.phone}</Text>}
            {(patient?.dob || patient?.bloodGroup) && (
              <Text className="mt-0.5 text-[11px] text-zinc-400">
                {[patient?.dob, patient?.bloodGroup].filter(Boolean).join(" · ")}
              </Text>
            )}
          </View>

          <Card className="mb-4 overflow-hidden">
            {rows.map((r, i) => (
              <TouchableOpacity
                key={r.label}
                onPress={r.onPress}
                className={`flex-row items-center px-4 py-3.5 ${i > 0 ? "border-t border-zinc-100" : ""}`}
              >
                <r.icon size={17} color="#208AEF" />
                <Text className="ml-3 flex-1 text-sm font-semibold text-zinc-800">{r.label}</Text>
                <ChevronRight size={16} color="#d4d4d8" />
              </TouchableOpacity>
            ))}
          </Card>

          {user?.roles && user.roles.length > 0 && (
            <Card className="mb-4 p-4">
              <View className="mb-2 flex-row items-center">
                <ShieldCheck size={16} color="#208AEF" />
                <Text className="ml-1.5 text-sm font-bold text-zinc-900">Access</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {user.roles.map((r) => (
                  <View key={`${r.role}-${r.hospitalId ?? "global"}`} className="rounded-full bg-zinc-100 px-3 py-1.5">
                    <Text className="text-[11px] font-semibold text-zinc-600">{r.role.replace("_", " ")}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          <Text className="mb-2 text-xs font-bold tracking-widest text-zinc-400">MY DEVICES</Text>
          <Card className="mb-4 overflow-hidden">
            {devices.length === 0 ? (
              <Text className="p-4 text-xs text-zinc-400">No devices registered yet.</Text>
            ) : (
              devices.map((d, i) => {
                return (
                  <View
                    key={d.id}
                    className={`flex-row items-center px-4 py-3 ${i > 0 ? "border-t border-zinc-100" : ""}`}
                  >
                    <Smartphone size={16} color="#71717a" />
                    <View className="ml-3 flex-1">
                      <Text className="text-[13px] font-semibold text-zinc-800">{d.name ?? d.deviceId.slice(0, 12)}</Text>
                      <Text className="text-[10px] text-zinc-400">
                        {d.platform ?? "unknown"} · last seen {d.lastSeenAt?.slice(0, 10)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => revokeDevice(d)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text className="text-[11px] font-bold text-red-500">REVOKE</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </Card>

          <TouchableOpacity
            onPress={confirmSignOut}
            className="flex-row items-center justify-center rounded-xl bg-red-50 py-4"
          >
            <LogOut size={18} color="#dc2626" />
            <Text className="ml-2 font-bold text-red-600">Sign out</Text>
          </TouchableOpacity>

          <Text className="mt-6 text-center text-[11px] text-zinc-400">
            Atelier Health v{process.env.EXPO_PUBLIC_APP_VERSION ?? "1.0.0"}
            {minSupported ? ` · min supported ${minSupported}` : ""}
          </Text>
        </ScrollView>
      </Screen>
    </>
  );
}
