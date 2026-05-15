import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors } from "../src/config/colors";

const sections = [
  {
    title: "Information We Collect",
    content:
      "We collect personal information you provide when creating an account, including your name, email address, phone number, and medical history. We also collect appointment records, prescriptions, and billing information to provide our services.",
  },
  {
    title: "How We Use Your Information",
    content:
      "Your information is used to provide healthcare services, manage appointments, process prescriptions, generate bills, and communicate with your healthcare providers. We do not sell your personal data to third parties.",
  },
  {
    title: "Data Security",
    content:
      "We implement industry-standard security measures to protect your personal and medical information. All data is encrypted in transit and at rest. Access to patient data is restricted to authorized healthcare professionals.",
  },
  {
    title: "Data Retention",
    content:
      "We retain your medical records and personal information as required by applicable healthcare regulations. You may request deletion of non-essential data by contacting our support team.",
  },
  {
    title: "Your Rights",
    content:
      "You have the right to access, correct, or delete your personal data. You can also request a copy of your data or restrict how it is processed. Contact us at privacy@hospital.ms to exercise these rights.",
  },
  {
    title: "Third-Party Services",
    content:
      "We may use third-party services for payment processing and communication. These services are bound by their own privacy policies and are required to protect your information.",
  },
  {
    title: "Changes to This Policy",
    content:
      "We may update this privacy policy from time to time. We will notify you of any significant changes through the app or via email.",
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.lastUpdated}>Last updated: May 2026</Text>

      <Text style={styles.intro}>
        Your privacy is important to us. This policy explains how we collect,
        use, and protect your personal and medical information.
      </Text>

      {sections.map((section, index) => (
        <View key={index} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {index + 1}. {section.title}
          </Text>
          <Text style={styles.sectionContent}>{section.content}</Text>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Questions? Contact us at privacy@hospital.ms
        </Text>
      </View>
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
  lastUpdated: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 16,
  },
  intro: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginBottom: 6,
  },
  sectionContent: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
});
