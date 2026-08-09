import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function GroupsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />

      <Stack.Screen name="[id]/index" />

      <Stack.Screen
        name="create"
        options={{
          presentation: "transparentModal",
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          presentation: "transparentModal",
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack>
  );
}
