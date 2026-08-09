import { useSettingsStore } from "@/src/store/settings.store";

const lightPalette = {
  mode: "light",
  isDark: false,
  background: "#F5F8FC",
  surface: "#FFFFFF",
  primaryLight: "#EAF4FF",
  surfaceMuted: "#F8FAFD",
  border: "#E1E8F2",
  textPrimary: "#14213D",
  textSecondary: "#68758C",
  textLight: "#98A2B3",
  successLight: "#E9F8F1",
  warningLight: "#FFF5DD",
  errorLight: "#FFF0F0",
  purpleLight: "#F0EDFF",
  orangeLight: "#FFF1E8",
} as const;

const darkPalette = {
  mode: "dark",
  isDark: true,
  background: "#0B1220",
  surface: "#141E2E",
  primaryLight: "#122D49",
  surfaceMuted: "#1B293D",
  border: "#2A384C",
  textPrimary: "#F2F6FC",
  textSecondary: "#A9B7CA",
  textLight: "#8492A6",
  successLight: "#123429",
  warningLight: "#3B2C11",
  errorLight: "#3C1D22",
  purpleLight: "#28223F",
  orangeLight: "#3A2419",
} as const;

export type AppPalette = typeof lightPalette | typeof darkPalette;

/** Explicit app palette for components that use React Native StyleSheet. */
export const useAppPalette = () => {
  const darkMode = useSettingsStore((state) => state.darkMode);
  return darkMode ? darkPalette : lightPalette;
};
