import { Ionicons } from "@expo/vector-icons";
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
import { Card } from "../src/components/Card";
import { Button } from "../src/components/Button";
import { LoadingScreen } from "../src/components/LoadingScreen";
import { Colors } from "../src/config/colors";
import { useAuth } from "../src/context/AuthContext";
import { patientService, Patient, Vitals } from "../src/services/patient";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

export default function PersonalInfoScreen() {
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("Male");

  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temperature, setTemperature] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const [editingVitals, setEditingVitals] = useState(false);

  useEffect(() => {
    loadPatient();
  }, []);

  async function loadPatient() {
    if (!user?.id) return;
    try {
      const data = await patientService.getByUserId(user.id);
      setPatient(data);
      setFirstName(data.firstName || "");
      setLastName(data.lastName || "");
      setPhone(data.phone || "");
      setGender(data.gender || "Male");
      if (data.vitals) {
        setBp(data.vitals.bp || "");
        setHr(data.vitals.hr?.toString() || "");
        setSpo2(data.vitals.spo2?.toString() || "");
        setTemperature(data.vitals.temperature?.toString() || "");
        setWeight(data.vitals.weight?.toString() || "");
        setHeight(data.vitals.height?.toString() || "");
      }
    } catch {
      Alert.alert("Error", "Failed to load patient info");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveInfo() {
    if (!patient) return;
    setSaving(true);
    try {
      const updated = await patientService.update(patient.id, {
        firstName,
        lastName,
        phone,
        gender,
      });
      setPatient(updated);
      Alert.alert("Success", "Personal information updated");
    } catch {
      Alert.alert("Error", "Failed to update information");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveVitals() {
    if (!patient) return;
    setSaving(true);
    try {
      const vitals: Vitals = {};
      if (bp) vitals.bp = bp;
      if (hr) vitals.hr = Number(hr);
      if (spo2) vitals.spo2 = Number(spo2);
      if (temperature) vitals.temperature = Number(temperature);
      if (weight) vitals.weight = Number(weight);
      if (height) vitals.height = Number(height);

      const updated = await patientService.update(patient.id, { vitals });
      setPatient(updated);
      setEditingVitals(false);
      Alert.alert("Success", "Vitals updated");
    } catch {
      Alert.alert("Error", "Failed to update vitals");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Personal Information</Text>

      <Card>
        <Text style={styles.sectionTitle}>Basic Details</Text>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={inputStyles.label}>First Name</Text>
            <TextInput
              style={inputStyles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First Name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={inputStyles.label}>Last Name</Text>
            <TextInput
              style={inputStyles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last Name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        <View style={inputStyles.container}>
          <Text style={inputStyles.label}>Phone</Text>
          <TextInput
            style={inputStyles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        <View style={inputStyles.container}>
          <Text style={inputStyles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.genderBtn,
                  gender === option && styles.genderBtnActive,
                ]}
                onPress={() => setGender(option)}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === option && styles.genderTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          title="Save Details"
          variant="primary"
          loading={saving}
          style={{ minHeight: 40, paddingVertical: 10, marginTop: 12 }}
          textStyle={{ fontSize: 12, fontFamily: "Inter_400Regular" }}
          onPress={handleSaveInfo}
        />
      </Card>

      <Card>
        <View style={styles.vitalsHeader}>
          <Text style={styles.sectionTitle}>Health Vitals</Text>
          <TouchableOpacity onPress={() => setEditingVitals(!editingVitals)}>
            <Text style={styles.editBtn}>{editingVitals ? "Cancel" : "Update Vitals"}</Text>
          </TouchableOpacity>
        </View>

        {editingVitals ? (
          <>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={inputStyles.label}>Blood Pressure</Text>
                <TextInput
                  style={inputStyles.input}
                  value={bp}
                  onChangeText={setBp}
                  placeholder="e.g. 120/80"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={inputStyles.label}>Heart Rate</Text>
                <TextInput
                  style={inputStyles.input}
                  value={hr}
                  onChangeText={setHr}
                  placeholder="e.g. 72"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={inputStyles.label}>SpO2</Text>
                <TextInput
                  style={inputStyles.input}
                  value={spo2}
                  onChangeText={setSpo2}
                  placeholder="e.g. 98"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={inputStyles.label}>Temperature (°F)</Text>
                <TextInput
                  style={inputStyles.input}
                  value={temperature}
                  onChangeText={setTemperature}
                  placeholder="e.g. 98.6"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={inputStyles.label}>Weight (kg)</Text>
                <TextInput
                  style={inputStyles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g. 70"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={inputStyles.label}>Height (cm)</Text>
                <TextInput
                  style={inputStyles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="e.g. 170"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Button
              title="Save Vitals"
              variant="primary"
              loading={saving}
              style={{ minHeight: 40, paddingVertical: 10, marginTop: 12 }}
              textStyle={{ fontSize: 12, fontFamily: "Inter_400Regular" }}
              onPress={handleSaveVitals}
            />
          </>
        ) : (
          <View>
            <View style={styles.vitalsRow}>
              <VitalItem
                icon="heart-outline"
                label="Blood Pressure"
                value={patient?.vitals?.bp || "Not entered"}
              />
              <VitalItem
                icon="pulse-outline"
                label="Heart Rate"
                value={patient?.vitals?.hr ? `${patient.vitals.hr} bpm` : "Not entered"}
              />
            </View>
            <View style={styles.vitalsRow}>
              <VitalItem
                icon="water-outline"
                label="SpO2"
                value={patient?.vitals?.spo2 ? `${patient.vitals.spo2}%` : "Not entered"}
              />
              <VitalItem
                icon="thermometer-outline"
                label="Temperature"
                value={patient?.vitals?.temperature ? `${patient.vitals.temperature}°F` : "Not entered"}
              />
            </View>
            <View style={styles.vitalsRow}>
              <VitalItem
                icon="fitness-outline"
                label="Weight"
                value={patient?.vitals?.weight ? `${patient.vitals.weight} kg` : "Not entered"}
              />
              <VitalItem
                icon="resize-outline"
                label="Height"
                value={patient?.vitals?.height ? `${patient.vitals.height} cm` : "Not entered"}
              />
            </View>
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function VitalItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const isEntered = value !== "Not entered";

  return (
    <View style={vitalStyles.item}>
      <View style={vitalStyles.iconContainer}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={vitalStyles.info}>
        <Text style={vitalStyles.label}>{label}</Text>
        <Text style={[vitalStyles.value, !isEntered && vitalStyles.notEntered]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
});

const vitalStyles = StyleSheet.create({
  item: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginTop: 2,
  },
  notEntered: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
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
  pageTitle: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  genderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  genderBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  genderText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  genderTextActive: {
    color: Colors.text,
    fontFamily: "Inter_500Medium",
  },
  vitalsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  editBtn: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  vitalsRow: {
    flexDirection: "row",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
});
