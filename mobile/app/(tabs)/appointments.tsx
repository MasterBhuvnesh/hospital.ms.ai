import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

function getStatusVariant(status: string) {
  switch (status) {
    case "Completed":
      return "success";
    case "Cancelled":
      return "error";
    case "Confirmed":
      return "success";
    case "Scheduled":
      return "info";
    default:
      return "default";
  }
}

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAppointments = useCallback(async () => {
    try {
      const data = await appointmentService.list(user?.id);
      setAppointments(data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  async function onRefresh() {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  }

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
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No Appointments"
            subtitle="Book your first appointment with a doctor"
          />
        }
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/appointment/${item.id}`)}>
            <View style={styles.row}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar" size={16} color={Colors.primary} />
              </View>
              <View style={styles.info}>
                <Text style={styles.doctorName}>
                  Dr. {item.doctor?.firstName} {item.doctor?.lastName}
                </Text>
                <Text style={styles.specialization}>
                  {item.doctor?.specialization || item.type}
                </Text>
                <Text style={styles.dateTime}>
                  {item.date} at {item.time}
                </Text>
              </View>
              <Badge
                text={item.status}
                variant={getStatusVariant(item.status)}
              />
            </View>
          </Card>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/book-appointment")}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
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
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  specialization: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dateTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    fontFamily: "Inter_400Regular",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
});
