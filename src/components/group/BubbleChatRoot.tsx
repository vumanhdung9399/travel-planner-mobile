import { createPaperTheme } from "@/constants/paper-theme";
import { useSettingsStore } from "@/src/store/settings.store";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import BubbleChatContent from "./BubbleChatContent";

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function BubbleChatRoot() {
  const url = Linking.useURL();
  const darkMode = useSettingsStore((state) => state.darkMode);
  const theme = useMemo(() => createPaperTheme(darkMode), [darkMode]);
  const parsed = url ? Linking.parse(url) : null;
  const pathParts = parsed?.path?.split("/").filter(Boolean) || [];
  const groupId = parsed?.hostname === "bubble" ? pathParts[0] : pathParts.at(-1);
  const groupName = firstValue(parsed?.queryParams?.name as string | string[] | undefined);
  const groupAvatar = firstValue(parsed?.queryParams?.avatar as string | string[] | undefined);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar style={darkMode ? "light" : "dark"} />
          <BubbleChatContent
            groupId={groupId || undefined}
            groupName={groupName}
            groupAvatar={groupAvatar}
          />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
