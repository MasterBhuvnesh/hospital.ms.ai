import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Colors } from "../../src/config/colors";
import { useAuth } from "../../src/context/AuthContext";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>{user?.role}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <Card>
          <MenuItem
            icon="person-outline"
            title="Personal Information"
            onPress={() => router.push("/personal-info")}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="document-text-outline"
            title="Medical Records"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            onPress={() => {}}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        <Card>
          <MenuItem
            icon="help-circle-outline"
            title="Help Center"
            onPress={() => router.push("/help-center")}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="shield-outline"
            title="Privacy Policy"
            onPress={() => router.push("/privacy-policy")}
          />
        </Card>
      </View>

      <View style={styles.logoutSection}>
        <Button
          title="Logout"
          variant="danger"
          onPress={handleLogout}
          style={{ paddingVertical: 10, minHeight: 40 }}
          textStyle={{ fontSize: 13, fontFamily: "Inter_400Regular" }}
        />
      </View>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  title,
  onPress,
  showArrow = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  showArrow?: boolean;
}) {
  return (
    <Card
      onPress={onPress}
      style={{ marginBottom: 0, shadowOpacity: 0, elevation: 0, padding: 12 }}
    >
      <View style={menuStyles.row}>
        <Ionicons name={icon} size={18} color={Colors.textMuted} />
        <Text style={menuStyles.title}>{title}</Text>
        {showArrow && <Ionicons name="chevron-forward" size={16} color={Colors.border} />}
      </View>
    </Card>
  );
}

const menuStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 20,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  name: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  email: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 4,
  },
  role: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  logoutSection: {
    marginTop: 4,
  },
});
