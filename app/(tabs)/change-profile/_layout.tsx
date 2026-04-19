import { Stack } from "expo-router";

export default function ChangeProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="edit" />

      <Stack.Screen name="change-password" />
    </Stack>
  );
}
