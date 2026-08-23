import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useAuth } from "./AuthContext";
import { api } from "@/lib/api";
import { getOrCreateDeviceId } from "@/lib/storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type NotificationState = {
  expoToken: string | null;
  permissionDenied: boolean;
};

const Ctx = createContext<NotificationState>({ expoToken: null, permissionDenied: false });

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [expoToken, setExpoToken] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        if (!Device.isDevice) return;
        const existing = await Notifications.getPermissionsAsync();
        let granted = existing.granted;
        if (!granted) {
          const req = await Notifications.requestPermissionsAsync();
          granted = req.granted;
        }
        if (!granted) {
          if (!cancelled) setPermissionDenied(true);
          return;
        }
        await Notifications.setNotificationChannelAsync("default", {
          name: "General",
          importance: Notifications.AndroidImportance.HIGH,
        });
        await Notifications.setNotificationChannelAsync("queue", {
          name: "Queue updates",
          importance: Notifications.AndroidImportance.MAX,
        });
        const projectId = (globalThis as any).__easProjectId as string | undefined;
        const tokenRes = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : ({} as any),
        );
        const token = tokenRes.data;
        if (!token || cancelled) return;
        setExpoToken(token);
        await api.comms.registerPush({
          token,
          platform: Platform.OS as "ios" | "android" | "web",
          deviceId: await getOrCreateDeviceId(),
        });
      } catch {
        // Push is best-effort: Expo Go limitations or missing EAS project id
        // must never block the app. SMS remains the fallback channel.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = response.notification.request.content.data?.link as string | undefined;
      if (link && typeof link === "string") router.push(link as any);
    });
    return () => sub.remove();
  }, [router]);

  const value = useMemo(() => ({ expoToken, permissionDenied }), [expoToken, permissionDenied]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppNotifications() {
  return useContext(Ctx);
}
