import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { LogOut, Mail, ShieldCheck } from "lucide-react-native";
import { Screen, Card } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

export default function Profile() {
  const { user, signOut } = useAuth();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen title="Profile">
        <ScrollView contentContainerClassName="px-5 pb-8">
          <View className="items-center mt-2 mb-6">
            <View className="w-20 h-20 rounded-full bg-primary-soft items-center justify-center">
              <Text className="text-primary-dark text-2xl font-bold">
                {(user?.fullName ?? "A")
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </Text>
            </View>
            <Text className="text-lg font-bold text-zinc-900 mt-3">{user?.fullName}</Text>
            {user?.email && (
              <View className="flex-row items-center mt-1">
                <Mail size={12} color="#a1a1aa" />
                <Text className="text-xs text-zinc-500 ml-1">{user.email}</Text>
              </View>
            )}
            {user?.phone && <Text className="text-xs text-zinc-500 mt-0.5">{user.phone}</Text>}
          </View>

          {user?.roles && user.roles.length > 0 && (
            <Card className="p-4 mb-4">
              <View className="flex-row items-center mb-2">
                <ShieldCheck size={16} color="#208AEF" />
                <Text className="text-sm font-bold text-zinc-900 ml-1.5">Access</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {user.roles.map((r) => (
                  <View key={`${r.role}-${r.hospitalId ?? "global"}`} className="bg-zinc-100 rounded-full px-3 py-1.5">
                    <Text className="text-[11px] font-semibold text-zinc-600">{r.role.replace("_", " ")}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          <TouchableOpacity
            onPress={() => signOut()}
            className="flex-row items-center justify-center bg-red-50 rounded-xl py-4 mt-2"
          >
            <LogOut size={18} color="#dc2626" />
            <Text className="text-red-600 font-bold ml-2">Sign out</Text>
          </TouchableOpacity>

          <Text className="text-[11px] text-zinc-400 text-center mt-6">Atelier Health · demo build</Text>
        </ScrollView>
      </Screen>
    </>
  );
}
