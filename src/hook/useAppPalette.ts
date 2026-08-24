import { useSettingsStore } from "@/src/store/settings.store";

const lightPalette = {
  mode: "light",
  isDark: false,
  background: "#FBFAF6",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  primaryLight: "#DFF3E9",
  surfaceMuted: "#F2F5F1",
  border: "#DFE7E3",
  textPrimary: "#18332E",
  textSecondary: "#687B76",
  textLight: "#9BA9A5",
  successLight: "#DFF3E9",
  warningLight: "#FFF2D8",
  errorLight: "#FEE8DF",
  purpleLight: "#EEEAFB",
  orangeLight: "#FFF0E8",
} as const;

const darkPalette = {
  mode: "dark",
  isDark: true,
  background: "#0C1714",
  surface: "#14231F",
  surfaceRaised: "#182A24",
  primaryLight: "#173B33",
  surfaceMuted: "#101D19",
  border: "#294139",
  textPrimary: "#F3F7F4",
  textSecondary: "#A9BAB4",
  textLight: "#7E938C",
  successLight: "#173B33",
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
