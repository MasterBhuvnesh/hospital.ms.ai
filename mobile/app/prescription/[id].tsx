import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { prescriptionService, Prescription } from "../../src/services/prescriptions";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { Button } from "../../src/components/Button";
import { LoadingScreen } from "../../src/components/LoadingScreen";
import { Colors } from "../../src/config/colors";

export default function PrescriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrescription();
  }, [id]);

  async function loadPrescription() {
    try {
      const data = await prescriptionService.getById(id!);
      setPrescription(data);
    } catch {
      Alert.alert("Error", "Failed to load prescription");
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function handleFulfill() {
    Alert.alert(
      "Mark as Fulfilled",
      "Are you sure you want to mark this prescription as fulfilled?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await prescriptionService.updateStatus(id!, "FULFILLED");
              setPrescription((prev) =>
                prev ? { ...prev, status: "FULFILLED" } : null
              );
            } catch {
              Alert.alert("Error", "Failed to update status");
            }
          },
        },
      ]
    );
  }

  if (loading) return <LoadingScreen />;
  if (!prescription) return null;

  const parts =
    prescription.medicine?.description?.split("·").map((s) => s.trim()) || [];
  const dose = parts[0] || "-";
  const frequency = parts[1] || "-";
  const duration = parts[2] || "-";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.mainCard}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="medkit" size={18} color={Colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.medicineName}>
              {prescription.medicine?.name || "Medicine"}
            </Text>
            <Text style={styles.quantity}>Qty: {prescription.quantity}</Text>
          </View>
          <Badge
            text={prescription.status}
            variant={
              prescription.status === "FULFILLED"
                ? "success"
                : prescription.status === "CANCELLED"
                ? "error"
                : "warning"
            }
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Dosage Information</Text>
        <DetailRow label="Dose" value={dose} />
        <DetailRow label="Frequency" value={frequency} />
        <DetailRow label="Duration" value={duration} />
        <DetailRow label="Quantity" value={String(prescription.quantity)} />
      </Card>

      {prescription.instructions && (
        <Card>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.bodyText}>{prescription.instructions}</Text>
        </Card>
      )}

      {prescription.doctor && (
        <Card>
          <Text style={styles.sectionTitle}>Prescribed By</Text>
          <View style={styles.doctorRow}>
            <View style={styles.doctorAvatar}>
              <Ionicons name="person" size={16} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.doctorName}>
                Dr. {prescription.doctor.firstName} {prescription.doctor.lastName}
              </Text>
              <Text style={styles.doctorSpec}>
                {prescription.doctor.specialization}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {prescription.issuedAt && (
        <Card>
          <Text style={styles.sectionTitle}>Issued On</Text>
          <Text style={styles.bodyText}>
            {new Date(prescription.issuedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </Card>
      )}

      {prescription.status === "PENDING" && (
        <Card>
          <Text style={styles.sectionTitle}>Update Status</Text>
          <Button
            title="Mark as Fulfilled"
            variant="primary"
            style={{ minHeight: 44, paddingVertical: 12 }}
            textStyle={{ fontSize: 12, fontFamily: "Inter_400Regular" }}
            onPress={handleFulfill}
          />
        </Card>
      )}
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  quantity: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  doctorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  doctorName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  doctorSpec: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
