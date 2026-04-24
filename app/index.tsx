import { useAuthStore } from "@/src/store/auth.store";
import { Redirect } from "expo-router";

export default function Index() {
  const { user } = useAuthStore();
  const isFirstTime = useAuthStore((state) => state.isFirstTime);

  if (isFirstTime) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
