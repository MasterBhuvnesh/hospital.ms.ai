import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Colors } from "../../src/config/colors";

export default function AuthLayout() {
  return (
    <>
      <StatusBar hidden />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
    </>
  );
}
