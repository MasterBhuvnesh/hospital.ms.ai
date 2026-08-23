import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link, router } from "expo-router";
import { HeartPulse, Mail, Lock, Eye, EyeOff, Phone, KeyRound } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";

type Mode = "password" | "otp";

export default function Login() {
  const { signIn, signInWithOtp } = useAuth();
  const [mode, setMode] = useState<Mode>("password");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otpDestination, setOtpDestination] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fail(e: unknown) {
    setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
  }

  async function submitPassword() {
    if (!identifier || !password) return setError("Enter your email/phone and password.");
    setBusy(true);
    setError(null);
    try {
      await signIn(identifier.trim(), password);
      router.replace("/(tabs)");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    if (!otpDestination) return setError("Enter your phone number first.");
    setBusy(true);
    setError(null);
    try {
      const res = await api.auth.requestOtp(otpDestination.trim(), "LOGIN");
      setOtpSent(true);
      if (res.devCode) setDevCode(res.devCode);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (otpCode.length !== 6) return setError("Enter the 6-digit code.");
    setBusy(true);
    setError(null);
    try {
      await signInWithOtp(otpDestination.trim(), otpCode);
      router.replace("/(tabs)");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  const field =
    "flex-row items-center bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 mb-3";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-white">
      <ScrollView contentContainerClassName="flex-grow justify-center px-7" keyboardShouldPersistTaps="handled">
        <View className="mb-8 items-center">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <HeartPulse size={32} color="#ffffff" />
          </View>
          <Text className="mt-4 text-2xl font-bold text-zinc-900">Atelier Health</Text>
          <Text className="mt-1 text-sm text-zinc-500">Your hospital visits, minus the waiting room</Text>
        </View>

        <View className="mb-4 flex-row bg-zinc-100 rounded-xl p-1">
          {(["password", "otp"] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => {
                setMode(m);
                setError(null);
              }}
              className={`flex-1 items-center rounded-lg py-2 ${mode === m ? "bg-white" : ""}`}
            >
              <Text className={`text-xs font-bold ${mode === m ? "text-zinc-900" : "text-zinc-400"}`}>
                {m === "password" ? "PASSWORD" : "PHONE OTP"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && (
          <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
            <Text className="text-xs leading-4 text-red-600">{error}</Text>
          </View>
        )}

        {mode === "password" ? (
          <>
            <View className={field}>
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
            <View className={`${field} mb-5`}>
              <Lock size={18} color="#a1a1aa" />
              <TextInput
                className="flex-1 py-3.5 px-2.5 text-[15px] text-zinc-900"
                placeholder="Password"
                placeholderTextColor="#a1a1aa"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showPassword ? <EyeOff size={18} color="#a1a1aa" /> : <Eye size={18} color="#a1a1aa" />}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={submitPassword}
              disabled={busy}
              className={`items-center rounded-xl py-4 ${busy ? "bg-primary/60" : "bg-primary"}`}
            >
              <Text className="text-[15px] font-bold text-white">{busy ? "Signing in…" : "Sign in"}</Text>
            </TouchableOpacity>
            <Link href="/(auth)/forgot" asChild>
              <TouchableOpacity className="mt-3 items-center">
                <Text className="text-xs font-semibold text-zinc-400">Forgot password?</Text>
              </TouchableOpacity>
            </Link>
          </>
        ) : (
          <>
            {!otpSent ? (
              <>
                <View className={field}>
                  <Phone size={18} color="#a1a1aa" />
                  <TextInput
                    className="flex-1 py-3.5 px-2.5 text-[15px] text-zinc-900"
                    placeholder="+91 phone number"
                    placeholderTextColor="#a1a1aa"
                    keyboardType="phone-pad"
                    value={otpDestination}
                    onChangeText={setOtpDestination}
                  />
                </View>
                <TouchableOpacity
                  onPress={sendOtp}
                  disabled={busy}
                  className={`items-center rounded-xl py-4 ${busy ? "bg-primary/60" : "bg-primary"}`}
                >
                  <Text className="text-[15px] font-bold text-white">{busy ? "Sending…" : "Send code"}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text className="mb-3 text-xs text-zinc-500">
                  Code sent to {otpDestination}. It expires in 5 minutes.
                  {devCode ? ` (Demo mode code: ${devCode})` : ""}
                </Text>
                <View className={`${field} mb-5`}>
                  <KeyRound size={18} color="#a1a1aa" />
                  <TextInput
                    className="flex-1 py-3.5 px-2.5 text-[18px] tracking-[6px] text-zinc-900"
                    placeholder="000000"
                    placeholderTextColor="#d4d4d8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otpCode}
                    onChangeText={(t) => setOtpCode(t.replace(/\D/g, ""))}
                  />
                </View>
                <TouchableOpacity
                  onPress={verifyOtp}
                  disabled={busy}
                  className={`items-center rounded-xl py-4 ${busy ? "bg-primary/60" : "bg-primary"}`}
                >
                  <Text className="text-[15px] font-bold text-white">{busy ? "Verifying…" : "Verify & sign in"}</Text>
                </TouchableOpacity>
                <TouchableOpacity className="mt-3 items-center" onPress={() => setOtpSent(false)}>
                  <Text className="text-xs font-semibold text-zinc-400">Change number</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-zinc-500">New here? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-sm font-semibold text-primary">Create an account</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <Text className="mt-8 text-center text-[11px] leading-4 text-zinc-400">
          Demo account: patient@atelier.local / Demo@12345
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
