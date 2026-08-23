import { useCallback, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, SendHorizontal, Sparkles, Trash2 } from "lucide-react-native";
import { Screen } from "@/components/ui";
import { useAlert } from "@/components/CustomAlert";
import { api } from "@/lib/api";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi! I am your Atelier copilot. Ask me about your visits, what a medicine does, or how to read a lab result.\n\nI am not a doctor - for clinical decisions I will always point you to yours.",
};

export default function AiChat() {
  const alert = useAlert();
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const scrollDown = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const history = messages.slice(1).slice(-10).map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setBusy(true);
    scrollDown();
    api.ai
      .chat(text, history)
      .then((res) => {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: res.content || "(no answer)" };
          return copy;
        });
        scrollDown();
      })
      .catch((e) => {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Sorry - " + (e instanceof Error ? e.message : "the assistant is unavailable right now") + ".",
          };
          return copy;
        });
        scrollDown();
      })
      .finally(() => setBusy(false));
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View className="flex-row items-center px-5 pb-2 pt-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10 }}>
            <ArrowLeft size={22} color="#3f3f46" />
          </TouchableOpacity>
          <Sparkles size={18} color="#208AEF" style={{ marginLeft: 10 }} />
          <Text className="ml-2 flex-1 text-lg font-bold text-zinc-900">Copilot</Text>
          <TouchableOpacity
            onPress={() =>
              alert.show({
                title: "Erase AI memory?",
                message:
                  "Everything the copilot remembers about you is deleted (DPDP erasure). This cannot be undone.",
                buttons: [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Erase",
                    style: "destructive",
                    onPress: () =>
                      api.ai
                        .memoryErase()
                        .then(({ deleted }) =>
                          alert.show({ title: "Memory erased", message: deleted + " memories deleted." }),
                        )
                        .catch(() => alert.show({ title: "Could not erase", message: "Try again later." })),
                  },
                ],
              })
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={19} color="#a1a1aa" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView ref={scrollRef} contentContainerClassName="px-5 pb-4">
            {messages.map((m, i) => (
              <View key={i} className={"mb-3 flex-row " + (m.role === "user" ? "justify-end" : "justify-start")}>
                <View
                  className={
                    "max-w-[84%] rounded-2xl px-4 py-3 " +
                    (m.role === "user" ? "bg-primary" : "border border-zinc-100 bg-white")
                  }
                >
                  <Text className={"text-[13.5px] leading-[19px] " + (m.role === "user" ? "text-white" : "text-zinc-800")}>
                    {m.content || "…"}
                  </Text>
                </View>
              </View>
            ))}
            {busy && (
              <Text className="pb-2 pl-1 text-[10px] font-semibold tracking-wide text-zinc-400">COPILOT IS THINKING…</Text>
            )}
          </ScrollView>

          <View className="flex-row items-center gap-2 border-t border-zinc-100 px-4 py-3 pb-5">
            <TextInput
              className="max-h-28 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[14px] text-zinc-900"
              placeholder="Ask anything…"
              placeholderTextColor="#a1a1aa"
              multiline
              value={input}
              onChangeText={setInput}
            />
            <TouchableOpacity
              onPress={send}
              disabled={busy || !input.trim()}
              className={`h-11 w-11 items-center justify-center rounded-xl ${busy || !input.trim() ? "bg-zinc-200" : "bg-primary"}`}
            >
              <SendHorizontal size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    </>
  );
}
