import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "../src/components/Card";
import { Colors } from "../src/config/colors";

const faqs = [
  {
    question: "How do I book an appointment?",
    answer:
      "Go to the Home tab and tap 'Book Appointment'. Select a doctor, choose your preferred date and time, then confirm your booking.",
  },
  {
    question: "How can I cancel an appointment?",
    answer:
      "Open the appointment from the Appointments tab, then tap 'Cancel Appointment' at the bottom. You can only cancel scheduled or confirmed appointments.",
  },
  {
    question: "Where can I find my prescriptions?",
    answer:
      "All your prescriptions are available in the Prescriptions tab. Tap on any prescription to view dosage details and doctor information.",
  },
  {
    question: "How do I view my bill?",
    answer:
      "Go to the Billing tab to see all your bills. For completed appointments, you can download the bill as a PDF from the appointment detail page.",
  },
  {
    question: "How do I contact support?",
    answer:
      "You can reach our support team at support@hospital.ms or call us at +91 1800-XXX-XXXX during working hours (9 AM - 6 PM).",
  },
];

export default function HelpCenterScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Help Center</Text>
      <Text style={styles.subtitle}>Frequently Asked Questions</Text>

      {faqs.map((faq, index) => (
        <Card key={index}>
          <View style={styles.faqRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="help-circle-outline" size={16} color={Colors.primary} />
            </View>
            <View style={styles.faqContent}>
              <Text style={styles.question}>{faq.question}</Text>
              <Text style={styles.answer}>{faq.answer}</Text>
            </View>
          </View>
        </Card>
      ))}

      <Card>
        <Text style={styles.contactTitle}>Still need help?</Text>
        <View style={styles.contactRow}>
          <Ionicons name="mail-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.contactText}>support@hospital.ms</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="call-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.contactText}>+91 1800-XXX-XXXX</Text>
        </View>
      </Card>
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 20,
  },
  faqRow: {
    flexDirection: "row",
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  faqContent: {
    flex: 1,
  },
  question: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginBottom: 4,
  },
  answer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  contactTitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginBottom: 10,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  contactText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});
