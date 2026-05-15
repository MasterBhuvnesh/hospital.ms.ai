import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Badge } from "../../src/components/Badge";
import { Card } from "../../src/components/Card";
import { EmptyState } from "../../src/components/EmptyState";
import { LoadingScreen } from "../../src/components/LoadingScreen";
import { Colors } from "../../src/config/colors";
import { useAuth } from "../../src/context/AuthContext";
import {
  Appointment,
  appointmentService,
} from "../../src/services/appointments";

function getPaymentStatus(appointment: Appointment) {
  if (appointment.status === "Completed") return { text: "Paid", variant: "success" as const };
  if (appointment.status === "Cancelled") return { text: "Cancelled", variant: "error" as const };
  return { text: "Pending", variant: "warning" as const };
}

export default function BillingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBilling = useCallback(async () => {
    try {
      const data = await appointmentService.list(user?.id);
      const withFees = data.filter((a) => a.fee);
      setAppointments(withFees);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  async function onRefresh() {
    setRefreshing(true);
    await loadBilling();
    setRefreshing(false);
  }

  async function markAsPaid(item: Appointment) {
    try {
      await appointmentService.updateStatus(item.id, "Completed");
      setAppointments((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: "Completed" } : a))
      );
    } catch {
      Alert.alert("Error", "Failed to update status");
    }
  }

  const totalPaid = appointments
    .filter((a) => a.status === "Completed")
    .reduce((sum, a) => sum + (a.fee || 0), 0);

  const totalPending = appointments
    .filter((a) => a.status !== "Completed" && a.status !== "Cancelled")
    .reduce((sum, a) => sum + (a.fee || 0), 0);

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          appointments.length > 0 ? (
            <View style={styles.summary}>
              <View style={[styles.summaryCard, styles.paidCard]}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryIconContainer}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
                  </View>
                  <View>
                    <Text style={styles.summaryLabel}>Total Paid</Text>
                    <Text style={[styles.summaryAmount, { color: Colors.success }]}>₹{totalPaid}</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.summaryCard, styles.pendingCard]}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryIconContainer}>
                    <Ionicons name="time-outline" size={16} color={Colors.warning} />
                  </View>
                  <View>
                    <Text style={styles.summaryLabel}>Pending</Text>
                    <Text style={[styles.summaryAmount, { color: Colors.warning }]}>₹{totalPending}</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No Bills"
            subtitle="Your billing history will appear here"
          />
        }
        renderItem={({ item }) => (
          <SwipeableBillCard
            item={item}
            onSwipe={() => markAsPaid(item)}
            onPress={() => router.push(`/appointment/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

function SwipeableBillCard({
  item,
  onSwipe,
  onPress,
}: {
  item: Appointment;
  onSwipe: () => void;
  onPress: () => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);
  const isPending = item.status !== "Completed" && item.status !== "Cancelled";

  function renderLeftActions(_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0.5, 1],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.swipeAction}>
        <Animated.View style={[styles.swipeContent, { transform: [{ scale }] }]}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.swipeText}>Mark Paid</Text>
        </Animated.View>
      </View>
    );
  }

  function handleSwipeOpen() {
    swipeableRef.current?.close();
    onSwipe();
  }

  if (!isPending) {
    return (
      <Card onPress={onPress}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Ionicons name="receipt-outline" size={14} color={Colors.primary} />
          </View>
          <View style={styles.info}>
            <Text style={styles.doctorName}>
              Dr. {item.doctor?.firstName} {item.doctor?.lastName}
            </Text>
            <Text style={styles.date}>{item.date}</Text>
          </View>
          <View style={styles.rightSection}>
            <Text style={styles.fee}>₹{item.fee}</Text>
            <Badge
              text={getPaymentStatus(item).text}
              variant={getPaymentStatus(item).variant}
            />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={handleSwipeOpen}
      overshootLeft={false}
    >
      <Card onPress={onPress}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Ionicons name="receipt-outline" size={14} color={Colors.primary} />
          </View>
          <View style={styles.info}>
            <Text style={styles.doctorName}>
              Dr. {item.doctor?.firstName} {item.doctor?.lastName}
            </Text>
            <Text style={styles.date}>{item.date}</Text>
          </View>
          <View style={styles.rightSection}>
            <Text style={styles.fee}>₹{item.fee}</Text>
            <Badge
              text={getPaymentStatus(item).text}
              variant={getPaymentStatus(item).variant}
            />
          </View>
        </View>
      </Card>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 100,
  },
  summary: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
  },
  paidCard: {
    backgroundColor: Colors.successLight,
  },
  pendingCard: {
    backgroundColor: Colors.warningLight,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  summaryAmount: {
    fontSize: 20,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  doctorName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  date: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  rightSection: {
    alignItems: "flex-end",
    gap: 4,
  },
  fee: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  swipeAction: {
    backgroundColor: Colors.success,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  swipeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swipeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#fff",
  },
});
