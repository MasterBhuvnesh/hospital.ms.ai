import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../config/colors";

interface BadgeProps {
  text: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
}

const variantColors = {
  default: { bg: Colors.primary, text: "#FFFFFF" },
  success: { bg: Colors.success, text: "#FFFFFF" },
  warning: { bg: Colors.warning, text: "#FFFFFF" },
  error: { bg: Colors.error, text: "#FFFFFF" },
  info: { bg: Colors.primary, text: "#FFFFFF" },
};

export function Badge({ text, variant = "default" }: BadgeProps) {
  const colors = variantColors[variant];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
});
