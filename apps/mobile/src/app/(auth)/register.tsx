import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link, router } from "expo-router";
import { HeartPulse, Mail, Lock, User } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

export default function Register() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!fullName.trim() || !email.trim() || !password) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signUp({ fullName: fullName.trim(), email: email.trim().toLowerCase(), password });
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Registration failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = "flex-row items-center bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 mb-3";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-white">
      <ScrollView contentContainerClassName="flex-grow justify-center px-7" keyboardShouldPersistTaps="handled">
        <View className="items-center mb-10">
          <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center">
            <HeartPulse size={32} color="#ffffff" />
          </View>
          <Text className="text-2xl font-bold text-zinc-900 mt-4">Create account</Text>
          <Text className="text-sm text-zinc-500 mt-1">Book visits and track your live queue</Text>
        </View>

        {error && (
          <View className="bg-red-50 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-600 text-xs leading-4">{error}</Text>
          </View>
        )}

        <View className={field}>
          <User size={18} color="#a1a1aa" />
          <TextInput
            className="flex-1 py-3.5 px-2.5 text-[15px] text-zinc-900"
            placeholder="Full name"
            placeholderTextColor="#a1a1aa"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>
        <View className={field}>
          <Mail size={18} color="#a1a1aa" />
          <TextInput
            className="flex-1 py-3.5 px-2.5 text-[15px] text-zinc-900"
            placeholder="Email"
            placeholderTextColor="#a1a1aa"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <View className={field}>
          <Lock size={18} color="#a1a1aa" />
          <TextInput
            className="flex-1 py-3.5 px-2.5 text-[15px] text-zinc-900"
            placeholder="Password (min 8 characters)"
            placeholderTextColor="#a1a1aa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
        <View className={field}>
          <Lock size={18} color="#a1a1aa" />
          <TextInput
            className="flex-1 py-3.5 px-2.5 text-[15px] text-zinc-900"
            placeholder="Confirm password"
            placeholderTextColor="#a1a1aa"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        <TouchableOpacity
          onPress={submit}
          disabled={busy}
          className={`rounded-xl py-4 items-center mt-2 ${busy ? "bg-primary/60" : "bg-primary"}`}
        >
          <Text className="text-white font-bold text-[15px]">{busy ? "Creating…" : "Create account"}</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-sm text-zinc-500">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-sm font-semibold text-primary">Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
