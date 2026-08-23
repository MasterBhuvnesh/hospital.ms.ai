import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";

export type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

type AlertConfig = { title: string; message?: string; buttons?: AlertButton[] };

const Ctx = createContext<{ show: (cfg: AlertConfig) => void }>({ show: () => {} });

const TEXT_COLOR: Record<string, string> = {
  default: "text-primary",
  cancel: "text-zinc-500",
  destructive: "text-red-600",
};

export function AlertProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const busy = useRef(false);

  const show = useCallback((cfg: AlertConfig) => setConfig(cfg), []);

  const dismiss = (btn?: AlertButton) => {
    if (busy.current) return;
    busy.current = true;
    setConfig(null);
    btn?.onPress?.();
    setTimeout(() => (busy.current = false), 50);
  };

  const buttons = config?.buttons ?? [{ text: "OK", style: "default" as const }];

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <Modal transparent visible={config !== null} animationType="fade" onRequestClose={() => dismiss()}>
        <View className="flex-1 items-center justify-center bg-black/40 px-8">
          <View className="w-full rounded-2xl bg-white p-5">
            <Text className="text-base font-bold text-zinc-900">{config?.title}</Text>
            {config?.message ? (
              <Text className="mt-1.5 text-[13px] leading-[18px] text-zinc-600">{config.message}</Text>
            ) : null}
            <View className={`mt-4 flex-row ${buttons.length > 1 ? "justify-end gap-3" : "justify-end"}`}>
              {buttons.map((b) => (
                <TouchableOpacity key={b.text} onPress={() => dismiss(b)} className="rounded-lg px-3 py-2">
                  <Text className={`font-bold text-sm ${TEXT_COLOR[b.style ?? "default"]}`}>{b.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

export function useAlert() {
  return useContext(Ctx);
}
