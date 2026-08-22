import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({
  title,
  subtitle,
  children,
  loading = false,
  error,
}: {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
}) {
  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["top"]}>
      {(title || subtitle) && (
        <View className="px-5 pt-4 pb-2">
          {title && <Text className="text-2xl font-bold text-zinc-900">{title}</Text>}
          {subtitle && <Text className="text-sm text-zinc-500 mt-0.5">{subtitle}</Text>}
        </View>
      )}
      {loading ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color="#208AEF" />
          <Text className="text-sm text-zinc-400">Loading…</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-red-50 rounded-2xl px-5 py-4 w-full">
            <Text className="text-red-600 font-semibold text-center">Something went wrong</Text>
            <Text className="text-red-500 text-xs text-center mt-1 leading-4">{error}</Text>
          </View>
        </View>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <View className={`rounded-xl bg-zinc-200 ${className}`} />;
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <View className={`bg-white rounded-2xl border border-zinc-100 shadow-sm shadow-zinc-100 ${className}`}>
      {children}
    </View>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  EMERGENCY: "bg-red-50 text-red-600",
  SENIOR_CITIZEN: "bg-amber-50 text-amber-600",
  WOMAN_CHILD: "bg-pink-50 text-pink-600",
  NORMAL: "bg-primary-soft text-primary-dark",
};

export function Badge({ label }: { label: string }) {
  const style = PRIORITY_STYLES[label] ?? "bg-zinc-100 text-zinc-600";
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${style.split(" ")[0]}`}>
      <Text className={`text-[10px] font-bold tracking-wide ${style.split(" ")[1]}`}>{label.replace("_", " ")}</Text>
    </View>
  );
}
