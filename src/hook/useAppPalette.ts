import { useSettingsStore } from "@/src/store/settings.store";

const lightPalette = {
  background: "#F5F8FC",
  surface: "#FFFFFF",
  primaryLight: "#EAF4FF",
  surfaceMuted: "#F8FAFD",
  border: "#E1E8F2",
  textPrimary: "#14213D",
  textSecondary: "#68758C",
} as const;

const darkPalette = {
  // Group Detail uses this surface as its screen background; Trip Detail
  // deliberately matches it so tab scenes do not form alternating bands.
  background: "#141E2E",
  surface: "#141E2E",
  primaryLight: "#122D49",
  surfaceMuted: "#1B293D",
  border: "#2A384C",
  textPrimary: "#F2F6FC",
  textSecondary: "#A9B7CA",
} as const;

/** Explicit app palette for components that use React Native StyleSheet. */
export const useAppPalette = () => {
  const darkMode = useSettingsStore((state) => state.darkMode);
  return darkMode ? darkPalette : lightPalette;
};
