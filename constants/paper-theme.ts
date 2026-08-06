import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";
import { COLORS, UI_RADIUS } from "@/src/utils/constants";

export const createPaperTheme = (darkMode = false): MD3Theme => {
  const base = darkMode ? MD3DarkTheme : MD3LightTheme;
  return {
  ...base,
  roundness: UI_RADIUS.card / 4,
  colors: {
    ...base.colors,
    primary: COLORS.primary,
    onPrimary: "#FFFFFF",
    primaryContainer: darkMode ? "#122D49" : COLORS.primaryLight,
    onPrimaryContainer: COLORS.primaryDark,
    secondary: COLORS.secondary,
    secondaryContainer: "#DDF8F3",
    background: darkMode ? "#0B1220" : COLORS.background,
    surface: darkMode ? "#141E2E" : COLORS.surface,
    surfaceVariant: darkMode ? "#1B293D" : COLORS.surfaceMuted,
    outline: darkMode ? "#2A384C" : COLORS.border,
    outlineVariant: darkMode ? "#2A384C" : COLORS.border,
    error: COLORS.error,
    onSurface: darkMode ? "#F2F6FC" : COLORS.textPrimary,
    onSurfaceVariant: darkMode ? "#A9B7CA" : COLORS.textSecondary,
  },
  };
};

export const paperTheme = createPaperTheme();
