import type { LucideIcon } from "lucide-react-native";

export function AppIcon({
  icon: Icon,
  size = 24,
  color = "#3f3f46",
}: {
  icon: LucideIcon;
  size?: number;
  color?: string;
}) {
  return <Icon size={size} color={color} strokeWidth={2} />;
}
