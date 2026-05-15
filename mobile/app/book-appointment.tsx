import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Badge } from "../src/components/Badge";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { Input } from "../src/components/Input";
import { Colors } from "../src/config/colors";
import { useAuth } from "../src/context/AuthContext";
import { appointmentService } from "../src/services/appointments";
import { Doctor, doctorService } from "../src/services/doctors";

export default function BookAppointmentScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [searchBy, setSearchBy] = useState<"doctor" | "specialty">("doctor");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "rating" | "fee" | "exp" | "available" | null
  >(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState<"In-Person" | "Online">("In-Person");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    loadDoctors();
  }, []);

  async function loadDoctors() {
    try {
      const data = await doctorService.list();
      setDoctors(data);
    } catch {
      Alert.alert("Error", "Failed to load doctors");
    }
  }

  async function handleBook() {
    if (!selectedDoctor || !date || !time) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await appointmentService.create({
        patientId: user!.id,
        doctorId: selectedDoctor.id,
        date,
        time,
        type,
        notes: notes || undefined,
        fee: 500,
      });
      Alert.alert("Success", "Appointment booked successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to book appointment");
    } finally {
      setLoading(false);
    }
  }

  if (step === 1) {
    return (
      <>
        <StatusBar style="dark" />
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: 40 }]}
        >
          <Text style={styles.stepTitle}>Select a Doctor</Text>
          <Text style={styles.stepSubtitle}>
            Choose your preferred specialist
          </Text>

          <View style={styles.searchRow}>
            <TouchableOpacity
              style={[
                styles.filterBtn,
                searchBy === "doctor" && styles.filterBtnActive,
              ]}
              onPress={() => setSearchBy("doctor")}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  searchBy === "doctor" && styles.filterBtnTextActive,
                ]}
              >
                Dr.
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterBtn,
                searchBy === "specialty" && styles.filterBtnActive,
              ]}
              onPress={() => setSearchBy("specialty")}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  searchBy === "specialty" && styles.filterBtnTextActive,
                ]}
              >
                Specialty
              </Text>
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder={
                searchBy === "doctor"
                  ? "Search doctor..."
                  : "Search specialty..."
              }
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoComplete="off"
            />
          </View>

          <View style={styles.sortRow}>
            {(["rating", "fee", "exp", "available"] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.sortBtn,
                  sortBy === option && styles.sortBtnActive,
                ]}
                onPress={() => setSortBy(sortBy === option ? null : option)}
              >
                <Text
                  style={[
                    styles.sortBtnText,
                    sortBy === option && styles.sortBtnTextActive,
                  ]}
                >
                  {option === "exp"
                    ? "Exp"
                    : option === "available"
                      ? "Available"
                      : option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {doctors
            .filter((doctor) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              if (searchBy === "doctor") {
                return doctor.name.toLowerCase().includes(q);
              }
              return doctor.specialty.toLowerCase().includes(q);
            })
            .sort((a, b) => {
              if (!sortBy) return 0;
              if (sortBy === "rating") return b.rating - a.rating;
              if (sortBy === "fee") return a.fee - b.fee;
              if (sortBy === "exp") return parseInt(b.exp) - parseInt(a.exp);
              if (sortBy === "available")
                return (b.available ? 1 : 0) - (a.available ? 1 : 0);
              return 0;
            })
            .map((doctor) => (
              <Card
                key={doctor.id}
                onPress={() => {
                  if (doctor.available) {
                    setSelectedDoctor(doctor);
                    setStep(2);
                  }
                }}
                style={
                  selectedDoctor?.id === doctor.id
                    ? {
                        marginBottom: 8,
                        padding: 12,
                        borderWidth: 1.5,
                        borderColor: Colors.primary,
                        backgroundColor: Colors.primaryLight,
                      }
                    : {
                        marginBottom: 8,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: "#E0E0E0",
                      }
                }
              >
                <View style={styles.doctorRow}>
                  <View style={styles.doctorAvatar}>
                    <Text style={styles.doctorInitials}>
                      {doctor.img || "Dr"}
                    </Text>
                  </View>
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{doctor.name}</Text>
                    <Text style={styles.doctorSpec}>{doctor.specialty}</Text>
                    <View style={styles.doctorMeta}>
                      <Text style={styles.doctorMetaText}>{doctor.exp}</Text>
                      <Text style={styles.doctorMetaDot}>·</Text>
                      <Badge text={`${doctor.rating}`} variant="success" />
                      <Text style={styles.doctorMetaDot}>·</Text>
                      <Text style={styles.doctorMetaText}>₹{doctor.fee}</Text>
                    </View>
                  </View>
                  {doctor.available && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={Colors.textMuted}
                    />
                  )}
                </View>
              </Card>
            ))}

          {doctors.length === 0 && (
            <Text style={styles.noData}>No doctors available</Text>
          )}
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: 40 }]}
      >
        <TouchableOpacity style={styles.backStep} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={18} color={Colors.textMuted} />
          <Text style={styles.backStepText}>Change Doctor</Text>
        </TouchableOpacity>

        <Card>
          <View style={styles.doctorRow}>
            <View style={styles.doctorAvatar}>
              <Text style={styles.doctorInitials}>
                {selectedDoctor?.img || "Dr"}
              </Text>
            </View>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{selectedDoctor?.name}</Text>
              <Text style={styles.doctorSpec}>{selectedDoctor?.specialty}</Text>
            </View>
          </View>
        </Card>

        <Text style={[styles.stepTitle, { marginBottom: 16 }]}>
          Appointment Details
        </Text>

        <View style={styles.dateLabelRow}>
          <Text style={styles.fieldLabel}>Date</Text>
          <Text style={styles.scrollHint}>scroll →</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
        >
          <View style={styles.dateRow}>
            {Array.from({ length: 10 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const dateStr = d.toISOString().split("T")[0];
              const dayName = d.toLocaleDateString("en", { weekday: "short" });
              const dayNum = d.getDate();
              const month = d.toLocaleDateString("en", { month: "short" });
              const isSelected = date === dateStr;
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[styles.dateChip, isSelected && styles.dateChipActive]}
                  onPress={() => setDate(dateStr)}
                >
                  <Text
                    style={[
                      styles.dateDayName,
                      isSelected && styles.dateTextActive,
                    ]}
                  >
                    {dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dateDayNum,
                      isSelected && styles.dateTextActive,
                    ]}
                  >
                    {dayNum}
                  </Text>
                  <Text
                    style={[
                      styles.dateMonth,
                      isSelected && styles.dateTextActive,
                    ]}
                  >
                    {month}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.dateLabelRow}>
          <Text style={styles.fieldLabel}>Time</Text>
          <Text style={styles.scrollHint}>scroll →</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
        >
          <View style={styles.dateRow}>
            {[
              "10:00 AM",
              "11:00 AM",
              "12:00 PM",
              "4:00 PM",
              "5:00 PM",
              "6:00 PM",
              "7:00 PM",
              "8:00 PM",
            ].map((slot) => {
              const isSelected = time === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.timeChip, isSelected && styles.timeChipActive]}
                  onPress={() => setTime(slot)}
                >
                  <Text
                    style={[
                      styles.timeChipText,
                      isSelected && styles.timeChipTextActive,
                    ]}
                  >
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <Text style={styles.fieldLabel}>Appointment Type</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              type === "In-Person" && styles.typeBtnActive,
            ]}
            onPress={() => setType("In-Person")}
          >
            <Ionicons
              name="person"
              size={18}
              color={type === "In-Person" ? Colors.primary : Colors.textMuted}
            />
            <Text
              style={[
                styles.typeBtnText,
                type === "In-Person" && styles.typeBtnTextActive,
              ]}
            >
              In-Person
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === "Online" && styles.typeBtnActive]}
            onPress={() => setType("Online")}
          >
            <Ionicons
              name="videocam"
              size={18}
              color={type === "Online" ? Colors.primary : Colors.textMuted}
            />
            <Text
              style={[
                styles.typeBtnText,
                type === "Online" && styles.typeBtnTextActive,
              ]}
            >
              Online
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          label="Notes (Optional)"
          placeholder="Any additional notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: "top" }}
        />

        <Button
          title="Book Appointment"
          onPress={handleBook}
          loading={loading}
          textStyle={{ fontFamily: "Inter_400Regular" }}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 20,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: 16,
  },
  stepSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 20,
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
    marginRight: 10,
  },
  doctorInitials: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.primaryDark,
  },
  doctorMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  doctorMetaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  doctorMetaDot: {
    fontSize: 11,
    color: Colors.textMuted,
    marginHorizontal: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.secondaryLight,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
  },
  filterBtnText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  filterBtnTextActive: {
    color: Colors.text,
  },
  searchInput: {
    flex: 1,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  sortRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.secondaryLight,
  },
  sortBtnActive: {
    backgroundColor: Colors.primary,
  },
  sortBtnText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  sortBtnTextActive: {
    color: Colors.text,
  },
  dateLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  scrollHint: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  dateScroll: {
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateChip: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minWidth: 56,
  },
  dateChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateDayName: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  dateDayNum: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginVertical: 2,
  },
  dateMonth: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  dateTextActive: {
    color: Colors.text,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  timeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeChipText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  timeChipTextActive: {
    color: Colors.text,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  doctorSpec: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  doctorPhone: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  noData: {
    textAlign: "center",
    color: Colors.textMuted,
    marginTop: 40,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  backStep: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  backStepText: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeBtnText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  typeBtnTextActive: {
    color: Colors.text,
  },
});
