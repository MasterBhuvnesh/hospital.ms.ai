import { Tabs } from "expo-router";
import { House, Ticket, FileText, User } from "lucide-react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#208AEF",
        tabBarInactiveTintColor: "#a1a1aa",
        tabBarStyle: { backgroundColor: "#ffffff", borderTopColor: "#f4f4f5" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color }) => <House size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="visits"
        options={{ title: "Visits", tabBarIcon: ({ color }) => <Ticket size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="records"
        options={{ title: "Records", tabBarIcon: ({ color }) => <FileText size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => <User size={22} color={color} /> }}
      />
    </Tabs>
  );
}
