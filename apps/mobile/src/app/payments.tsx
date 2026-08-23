import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Linking } from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, Wallet, FileText, CheckCircle2 } from "lucide-react-native";
import { Screen, Card, Skeleton } from "@/components/ui";
import { useAlert } from "@/components/CustomAlert";
import { api, type Invoice } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  UNPAID: "bg-amber-50 text-amber-600",
  PAID: "bg-green-50 text-green-600",
  VOID: "bg-zinc-100 text-zinc-500",
  REFUNDED: "bg-purple-50 text-purple-600",
  PARTIALLY_REFUNDED: "bg-purple-50 text-purple-600",
};

export default function Payments() {
  const alert = useAlert();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setInvoices(await api.commerce.invoices());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load invoices");
    }
  }, []);

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  function pay(inv: Invoice) {
    alert.show({
      title: `Pay ${inv.total} ${inv.currency}?`,
      message: `${inv.invoiceNo} - demo checkout (no real money moves).`,
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay now",
          onPress: () => {
            setPayingId(inv.id);
            api.commerce
              .paymentIntent(inv.id)
              .then((payment) => api.commerce.capturePayment(payment.id))
              .then(async () => {
                await load();
                alert.show({ title: "Payment received", message: `${inv.invoiceNo} is settled.` });
              })
              .catch((e) =>
                alert.show({
                  title: "Payment failed",
                  message: e instanceof Error ? e.message : String(e),
                }),
              )
              .finally(() => setPayingId(null));
          },
        },
      ],
    });
  }

  async function openPdf(inv: Invoice) {
    let url = inv.downloadUrl ?? null;
    if (!url) {
      try {
        url = (await api.commerce.invoice(inv.id)).downloadUrl ?? null;
      } catch {}
    }
    if (url) Linking.openURL(url);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View className="flex-row items-center px-5 pb-1 pt-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10 }}>
            <ArrowLeft size={22} color="#3f3f46" />
          </TouchableOpacity>
          <Text className="ml-3 text-lg font-bold text-zinc-900">Bills & payments</Text>
        </View>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load().finally(() => setRefreshing(false));
              }}
              tintColor="#208AEF"
            />
          }
        >
          {error && (
            <View className="mb-3 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-xs leading-4 text-red-600">{error}</Text>
            </View>
          )}
          {loading ? (
            <>
              <Skeleton className="mb-3 h-24" />
              <Skeleton className="mb-3 h-24" />
              <Skeleton className="h-24" />
            </>
          ) : invoices.length === 0 ? (
            <View className="mt-24 items-center">
              <Wallet size={40} color="#e4e4e7" />
              <Text className="mt-3 text-sm text-zinc-500">No invoices yet</Text>
            </View>
          ) : (
            invoices.map((inv) => {
              const style = STATUS_STYLE[inv.status] ?? "bg-zinc-100 text-zinc-600";
              const expanded = expandedId === inv.id;
              return (
                <Card key={inv.id} className="mb-2.5 p-4">
                  <TouchableOpacity onPress={() => setExpandedId(expanded ? null : inv.id)}>
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-zinc-900">{inv.invoiceNo}</Text>
                        <Text className="mt-0.5 text-[11px] text-zinc-400">{inv.createdAt?.slice(0, 10)}</Text>
                      </View>
                      <Text className="mr-2 text-sm font-bold text-zinc-900">
                        {inv.total} {inv.currency}
                      </Text>
                      <View className={`self-start rounded-full px-2.5 py-1 ${style.split(" ")[0]}`}>
                        <Text className={`text-[10px] font-bold ${style.split(" ")[1]}`}>{inv.status}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {expanded && (
                    <View className="mt-3 border-t border-zinc-100 pt-3">
                      {(inv.lineItems ?? []).map((li, i) => (
                        <View key={i} className="mb-1 flex-row justify-between">
                          <Text className="flex-1 pr-2 text-xs text-zinc-600">{li.description}</Text>
                          <Text className="text-xs font-semibold text-zinc-800">
                            {li.amount} {li.currency}
                          </Text>
                        </View>
                      ))}
                      <View className="mt-3 flex-row items-center gap-3">
                        {inv.downloadUrl && (
                          <TouchableOpacity onPress={() => openPdf(inv)} className="flex-row items-center gap-1">
                            <FileText size={14} color="#208AEF" />
                            <Text className="text-xs font-bold text-primary">Invoice PDF</Text>
                          </TouchableOpacity>
                        )}
                        {inv.status === "UNPAID" && (
                          <TouchableOpacity
                            disabled={payingId === inv.id}
                            onPress={() => pay(inv)}
                            className={`ml-auto rounded-full px-4 py-2 ${payingId === inv.id ? "bg-primary/50" : "bg-primary"}`}
                          >
                            <Text className="text-[11px] font-bold text-white">
                              {payingId === inv.id ? "Processing…" : `Pay ${inv.total} ${inv.currency}`}
                            </Text>
                          </TouchableOpacity>
                        )}
                        {inv.paidAt && (
                          <View className="ml-auto flex-row items-center gap-1">
                            <CheckCircle2 size={13} color="#16a34a" />
                            <Text className="text-[10px] text-zinc-400">{inv.paidAt.slice(0, 10)}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </ScrollView>
      </Screen>
    </>
  );
}
