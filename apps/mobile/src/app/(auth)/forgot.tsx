import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { KeyRound, Phone, Lock, ArrowLeft } from "lucide-react-native";
import { api, ApiError } from "@/lib/api";
import { useAlert } from "@/components/CustomAlert";

export default function ForgotPassword() {
  const alert = useAlert();
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestReset() {
    if (!destination) return setError("Enter the email or phone on your account.");
    setBusy(true);
    setError(null);
    try {
      const res = await api.auth.requestOtp(destination.trim(), "RESET_PASSWORD");
      setSent(true);
      if (res.devCode) setDevCode(res.devCode);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset() {
    if (code.length !== 6) return setError("Enter the 6-digit code.");
    if (newPassword.length < 8) return setError("New password must be at least 8 characters.");
    setBusy(true);
    setError(null);
    try {
      await api.auth.verifyOtp({
        destination: destination.trim(),
        code,
        purpose: "RESET_PASSWORD",
        newPassword,
      });
      alert.show({
        title: "Password updated",
        message: "Sign in with your new password.",
        buttons: [{ text: "OK", onPress: () => router.replace("/(auth)/login") }],
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  const field = "flex-row items-center bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 mb-3";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-white">
      <ScrollView contentContainerClassName="flex-grow px-7 pt-20" keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} className="mb-6 self-start">
          <ArrowLeft size={22} color="#3f3f46" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-zinc-900">Reset password</Text>
        <Text className="mt-1 text-sm text-zinc-500">
          We will send a 6-digit verification code to your email or phone.
        </Text>

        {error && (
          <View className="mb-4 mt-5 rounded-xl bg-red-50 px-4 py-3">
            <Text className="text-xs leading-4 text-red-600">{error}</Text>
          </View>
        )}

        <View className={`${field} mt-5`}>
          <Phone size={18} color="#a1a1aa" />
          <TextInput
            className="flex-1 py-3.5 px-2.5 text-[15px] text-zinc-900"
            placeholder="Email or phone"
            placeholderTextColor="#a1a1aa"
            autoCapitalize="none"
            value={destination}
            onChangeText={setDestination}
          />
        </View>

        {sent ? (
          <>
            {devCode && (
              <Text className="-mt-1 mb-3 text-xs font-semibold text-primary">Demo mode code: {devCode}</Text>
            )}
            <View className={field}>
              <KeyRound size={18} color="#a1a1aa" />
              <TextInput
                className="flex-1 py-3.5 px-2.5 text-[18px] tracking-[6px] text-zinc-900"
                placeholder="000000"
                placeholderTextColor="#d4d4d8"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
              />
            </View>
            <View className={field}>
              <Lock size={18} color="#a1a1aa" />
              <TextInput
                className="flex-1 py-3.5 px-2.5 text-[15px] text-zinc-900"
                placeholder="New password (min 8 characters)"
                placeholderTextColor="#a1a1aa"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>
            <TouchableOpacity
              onPress={confirmReset}
              disabled={busy}
              className={`items-center rounded-xl py-4 ${busy ? "bg-primary/60" : "bg-primary"}`}
            >
              <Text className="text-[15px] font-bold text-white">{busy ? "Updating…" : "Set new password"}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="mt-3 items-center" onPress={requestReset}>
              <Text className="text-xs font-semibold text-zinc-400">Resend code</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={requestReset}
            disabled={busy}
            className={`items-center rounded-xl py-4 ${busy ? "bg-primary/60" : "bg-primary"}`}
          >
            <Text className="text-[15px] font-bold text-white">{busy ? "Sending…" : "Send code"}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
