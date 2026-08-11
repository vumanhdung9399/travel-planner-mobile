import { Stack } from "expo-router";

export default function TripsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />

      <Stack.Screen
        name="[id]/index"
        options={({ route }) => ({
          gestureEnabled: !(route.params as { originGroupId?: string } | undefined)
            ?.originGroupId,
        })}
      />
      <Stack.Screen name="[id]/map-form" />
      <Stack.Screen
        name="[id]/timeline-form"
        options={{
          presentation: "transparentModal",
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="[id]/expense-form"
        options={{
          presentation: "transparentModal",
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="[id]/fund-form"
        options={{
          presentation: "transparentModal",
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack>
  );
}
