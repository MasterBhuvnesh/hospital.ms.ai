import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { generateBillPdf } from "../../src/utils/generateBillPdf";
import { appointmentService, Appointment } from "../../src/services/appointments";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { LoadingScreen } from "../../src/components/LoadingScreen";
import { Colors } from "../../src/config/colors";

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointment();
  }, [id]);

  async function loadAppointment() {
    try {
      const data = await appointmentService.getById(id!);
      setAppointment(data);
    } catch {
      Alert.alert("Error", "Failed to load appointment");
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await appointmentService.updateStatus(id!, "Cancelled");
              setAppointment((prev) => prev ? { ...prev, status: "Cancelled" } : null);
            } catch {
              Alert.alert("Error", "Failed to cancel appointment");
            }
          },
        },
      ]
    );
  }

  if (loading) return <LoadingScreen />;
  if (!appointment) return null;

  const canCancel =
    appointment.status === "Scheduled" || appointment.status === "Confirmed";

  const isOnline = appointment.type?.toLowerCase() === "online";

  async function handleViewBill() {
    if (!appointment) return;
    try {
      await generateBillPdf(appointment);
    } catch {
      Alert.alert("Error", "Failed to generate PDF");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.mainCard}>
        <View style={styles.doctorSection}>
          <View style={styles.doctorAvatar}>
            <Ionicons name="person" size={22} color={Colors.primary} />
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>
              Dr. {appointment.doctor?.firstName} {appointment.doctor?.lastName}
            </Text>
            <Text style={styles.specialization}>
              {appointment.doctor?.specialization}
            </Text>
          </View>
          <Badge
            text={appointment.status}
            variant={
              appointment.status === "Completed"
                ? "success"
                : appointment.status === "Cancelled"
                ? "error"
                : "info"
            }
          />
        </View>
      </Card>

      <Card>
        <DetailRow
          icon={isOnline ? "videocam-outline" : "location-outline"}
          label="Appointment Type"
          value={isOnline ? "Online" : "In-person"}
        />
        <DetailRow icon="calendar-outline" label="Date" value={appointment.date} />
        <DetailRow icon="time-outline" label="Time" value={appointment.time} />
        {appointment.fee && (
          <DetailRow
            icon="cash-outline"
            label="Fee"
            value={`₹${appointment.fee}`}
          />
        )}
        {appointment.notes && (
          <NotesRow notes={appointment.notes} />
        )}
      </Card>

      {appointment.status === "Completed" && appointment.fee && (
        <Card>
          <Text style={styles.pdfTitle}>Bill / Receipt</Text>
          <Button
            title="Download Bill PDF"
            variant="primary"
            style={{ minHeight: 44, paddingVertical: 12 }}
            textStyle={{ fontSize: 12, fontFamily: "Inter_400Regular" }}
            onPress={handleViewBill}
          />
        </Card>
      )}

      {canCancel && (
        <View style={styles.actions}>
          <Button title="Cancel Appointment" variant="danger" onPress={handleCancel} />
        </View>
      )}
    </ScrollView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={detailStyles.row}>
      <Ionicons name={icon} size={16} color={Colors.textSecondary} />
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

function NotesRow({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={detailStyles.row}>
      <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
      <Text style={detailStyles.label}>Notes</Text>
      <View style={detailStyles.notesContainer}>
        <Text style={detailStyles.value} numberOfLines={expanded ? undefined : 2}>
          {notes}
        </Text>
        {notes.length > 60 && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Text style={detailStyles.seeMore}>
              {expanded ? "See Less" : "See More"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    flex: 1,
    marginLeft: 12,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  notesContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  seeMore: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
    marginTop: 4,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 40,
  },
  mainCard: {
    marginBottom: 12,
  },
  doctorSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorInfo: {
    flex: 1,
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
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
  pdfTitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  actions: {
    marginTop: 16,
  },
});
