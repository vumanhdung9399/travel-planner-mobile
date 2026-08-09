import { useAuthStore } from "@/src/store/auth.store";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { COLORS } from "@/src/utils/constants";
import { useAppPalette } from "@/src/hook/useAppPalette";

export default function Index() {
  const palette = useAppPalette();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isFirstTime = useAuthStore((state) => state.isFirstTime);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  if (!hasHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.background,
        }}
      >
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (isFirstTime) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
