import { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { api } from "@/lib/api";

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

export function useMinSupportedVersion(): string | null {
  const [min, setMin] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    api.config
      .app()
      .then((c) => mounted && setMin(c.minSupportedVersion))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  return min;
}

export function UpdateGate({ children }: { children: React.ReactNode }) {
  const min = useMinSupportedVersion();
  const current = process.env.EXPO_PUBLIC_APP_VERSION ?? "0.0.0";
  const blocked = useMemo(() => Boolean(min && compareVersions(current, min) < 0), [min, current]);

  if (!blocked) return <>{children}</>;
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <ShieldAlert size={44} color="#dc2626" />
      <Text className="mt-4 text-xl font-bold text-zinc-900">Update required</Text>
      <Text className="mt-2 text-center text-sm leading-5 text-zinc-600">
        This version ({current}) is no longer supported. Please update the app to continue.
      </Text>
      <ActivityIndicator color="#208AEF" style={{ marginTop: 16 }} />
    </View>
  );
}
