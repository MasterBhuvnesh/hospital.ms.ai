import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";
import { appointmentService, Appointment } from "../../src/services/appointments";
import { prescriptionService, Prescription } from "../../src/services/prescriptions";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { Colors } from "../../src/config/colors";

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [appts, rxs] = await Promise.all([
        appointmentService.list(user?.id),
        prescriptionService.list(user?.id),
      ]);
      setAppointments(appts.slice(0, 3));
      setPrescriptions(rxs.slice(0, 3));
    } catch {
      // silently fail on home screen
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const upcomingAppointments = appointments.filter(
    (a) => a.status === "Scheduled" || a.status === "Confirmed"
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>
          Hello, {user?.firstName || "Patient"} 👋
        </Text>
        <Text style={styles.greetingSubtext}>How are you feeling today?</Text>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/book-appointment")}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primaryDark} />
          </View>
          <Text style={styles.actionText}>Book{"\n"}Appointment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/(tabs)/prescriptions")}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.successLight }]}>
            <Ionicons name="medkit-outline" size={18} color={Colors.success} />
          </View>
          <Text style={styles.actionText}>My{"\n"}Prescriptions</Text>
        </TouchableOpacity>

      </View>

      {upcomingAppointments.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/appointments")}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {upcomingAppointments.map((appt) => (
            <Card
              key={appt.id}
              onPress={() => router.push(`/appointment/${appt.id}`)}
            >
              <View style={styles.appointmentRow}>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentDoctor}>
                    Dr. {appt.doctor?.firstName} {appt.doctor?.lastName}
                  </Text>
                  <Text style={styles.appointmentSpec}>
                    {appt.doctor?.specialization}
                  </Text>
                  <Text style={styles.appointmentTime}>
                    {appt.date} at {appt.time}
                  </Text>
                </View>
                <Badge
                  text={appt.status}
                  variant={appt.status === "Confirmed" ? "success" : "info"}
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      {prescriptions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Prescriptions</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/prescriptions")}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {prescriptions.map((rx) => {
            const parts =
              rx.medicine?.description?.split("·").map((s) => s.trim()) || [];
            const dose = parts[0] || "-";
            const frequency = parts[1] || "-";
            const duration = parts[2] || "-";

            return (
              <Card
                key={rx.id}
                onPress={() => router.push(`/prescription/${rx.id}`)}
              >
                <View style={styles.rxRow}>
                  <View style={styles.rxIconContainer}>
                    <Ionicons name="document-text" size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.rxInfo}>
                    <Text style={styles.rxMedicine}>
                      {rx.medicine?.name || "Medicine"}
                    </Text>
                    <Text style={styles.rxDetail}>{dose}</Text>
                    <Text style={styles.rxDetail}>{frequency}</Text>
                    <Text style={styles.rxDetail}>{duration}</Text>
                  </View>
                  <Badge
                    text={rx.status}
                    variant={rx.status === "FULFILLED" ? "success" : "warning"}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 100,
  },
  greeting: {
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  greetingSubtext: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 4,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  seeAll: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  appointmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentDoctor: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  appointmentSpec: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  appointmentTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
    fontFamily: "Inter_400Regular",
  },
  rxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rxIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rxInfo: {
    flex: 1,
  },
  rxMedicine: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  rxDetail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
