import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { router, Stack } from "expo-router";
import { BellRing, ChevronRight } from "lucide-react-native";
import { Screen, Card, Skeleton } from "@/components/ui";
import { api, type AppNotification } from "@/lib/api";

export default function NotificationsInbox() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const data = await api.comms.notifications();
    setItems(data.items);
    setUnread(data.unreadCount);
  }, []);

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }, [load]);

  function open(n: AppNotification) {
    if (!n.readAt) api.comms.markRead(n.id).then(load).catch(() => {});
    const link = n.link ?? n.meta?.link;
    if (link && typeof link === "string") router.push(link as any);
  }

  return (
    <>
      <Stack.Screen
        options={{ headerShown: false }}
      />
      <Screen title="Notifications" subtitle={unread > 0 ? `${unread} unread` : "All caught up"}>
        <View className="flex-row justify-end px-5">
          {unread > 0 && (
            <TouchableOpacity onPress={() => api.comms.markAllRead().then(load).catch(() => {})}>
              <Text className="text-xs font-bold text-primary">Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#208AEF" />}
        >
          {loading ? (
            <>
              <Skeleton className="h-20 mb-3" />
              <Skeleton className="h-20 mb-3" />
              <Skeleton className="h-20" />
            </>
          ) : items.length === 0 ? (
            <View className="mt-24 items-center">
              <BellRing size={40} color="#e4e4e7" />
              <Text className="mt-3 text-sm text-zinc-500">Nothing here yet</Text>
            </View>
          ) : (
            items.map((n) => (
              <TouchableOpacity key={n.id} activeOpacity={0.85} onPress={() => open(n)}>
                <Card className={`mb-2.5 p-4 ${!n.readAt ? "border-primary/30" : ""}`}>
                  <View className="flex-row items-start">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-2">
                        {!n.readAt && <View className="h-2 w-2 rounded-full bg-primary" />}
                        <Text className={`flex-1 text-sm font-bold ${n.readAt ? "text-zinc-600" : "text-zinc-900"}`}>
                          {n.subject}
                        </Text>
                      </View>
                      <Text className="mt-1 text-xs leading-[17px] text-zinc-500">{n.body}</Text>
                      <View className="mt-2 flex-row items-center justify-between">
                        <View className="rounded-full bg-zinc-100 px-2 py-0.5">
                          <Text className="text-[9px] font-bold text-zinc-500">{n.category}</Text>
                        </View>
                        {(n.deliveries ?? [])
                          .filter((d) => d.channel !== "INAPP")
                          .map((d) => (
                            <Text key={d.channel} className="text-[9px] font-semibold text-zinc-400">
                              {d.channel}: {d.status}
                            </Text>
                          ))}
                      </View>
                    </View>
                    {(n.link || n.meta?.link) && <ChevronRight size={16} color="#d4d4d8" />}
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </Screen>
    </>
  );
}
