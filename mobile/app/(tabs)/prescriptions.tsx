import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Badge } from "../../src/components/Badge";
import { Card } from "../../src/components/Card";
import { EmptyState } from "../../src/components/EmptyState";
import { LoadingScreen } from "../../src/components/LoadingScreen";
import { Colors } from "../../src/config/colors";
import { useAuth } from "../../src/context/AuthContext";
import {
  Prescription,
  prescriptionService,
} from "../../src/services/prescriptions";

function getStatusVariant(status: string) {
  switch (status) {
    case "FULFILLED":
      return "success";
    case "CANCELLED":
      return "error";
    case "PENDING":
      return "warning";
    default:
      return "default";
  }
}

export default function PrescriptionsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPrescriptions = useCallback(async () => {
    try {
      const data = await prescriptionService.list(user?.id);
      setPrescriptions(data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  async function onRefresh() {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  }

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={prescriptions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="medkit-outline"
            title="No Prescriptions"
            subtitle="Your prescriptions will appear here"
          />
        }
        renderItem={({ item }) => {
          const parts =
            item.medicine?.description?.split("·").map((s) => s.trim()) || [];
          const dose = parts[0] || "-";
          const frequency = parts[1] || "-";
          const duration = parts[2] || "-";

          return (
            <Card onPress={() => router.push(`/prescription/${item.id}`)}>
              <View style={styles.row}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="document-text"
                    size={16}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.medicineName}>
                    {item.medicine?.name || "Medicine"}
                  </Text>
                  <Text style={styles.detail}>{dose}</Text>
                  <Text style={styles.detail}>{frequency}</Text>
                  <Text style={styles.detail}>{duration}</Text>
                  <Text style={styles.doctorName}>
                    ~ Dr. {item.doctor?.firstName} {item.doctor?.lastName}
                  </Text>
                </View>
                <Badge
                  text={item.status}
                  variant={getStatusVariant(item.status)}
                />
              </View>
            </Card>
          );
        }}
      />
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
  medicineName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  detail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  duration: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    fontFamily: "Inter_400Regular",
  },
  doctorName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 4,
  },
});
