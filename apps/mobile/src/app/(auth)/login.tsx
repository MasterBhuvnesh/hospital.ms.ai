import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link, router } from "expo-router";
import { HeartPulse, Mail, Lock, Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

export default function Login() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!identifier || !password) {
      setError("Enter your email/phone and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(identifier.trim(), password);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Login failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-white">
      <ScrollView contentContainerClassName="flex-grow justify-center px-7" keyboardShouldPersistTaps="handled">
        <View className="items-center mb-10">
          <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center">
            <HeartPulse size={32} color="#ffffff" />
          </View>
          <Text className="text-2xl font-bold text-zinc-900 mt-4">Atelier Health</Text>
          <Text className="text-sm text-zinc-500 mt-1">Your hospital visits, minus the waiting room</Text>
        </View>

        {error && (
          <View className="bg-red-50 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-600 text-xs leading-4">{error}</Text>
          </View>
        )}

        <View className="flex-row items-center bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 mb-3">
          <Mail size={18} color="#a1a1aa" />
          <TextInput
            className="flex-1 py-3.5 px-2.5 text-[15px] text-zinc-900"
            placeholder="Email or phone"
            placeholderTextColor="#a1a1aa"
            autoCapitalize="none"
            keyboardType="email-address"
            value={identifier}
            onChangeText={setIdentifier}
          />
        </View>

        <View className="flex-row items-center bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 mb-5">
          <Lock size={18} color="#a1a1aa" />
          <TextInput
            className="flex-1 py-3.5 px-2.5 text-[15px] text-zinc-900"
            placeholder="Password"
            placeholderTextColor="#a1a1aa"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {showPassword ? <EyeOff size={18} color="#a1a1aa" /> : <Eye size={18} color="#a1a1aa" />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={submit}
          disabled={busy}
          className={`rounded-xl py-4 items-center ${busy ? "bg-primary/60" : "bg-primary"}`}
        >
          <Text className="text-white font-bold text-[15px]">{busy ? "Signing in…" : "Sign in"}</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-sm text-zinc-500">New here? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-sm font-semibold text-primary">Create an account</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <Text className="text-[11px] text-zinc-400 text-center mt-8 leading-4">
          Demo account: patient@atelier.local / Demo@12345
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
