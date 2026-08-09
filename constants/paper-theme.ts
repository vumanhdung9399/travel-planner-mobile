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
      onPrimaryContainer: darkMode ? "#D9ECFF" : COLORS.primaryDark,
      secondary: COLORS.secondary,
      onSecondary: "#062E2A",
      secondaryContainer: darkMode ? "#123832" : "#DDF8F3",
      onSecondaryContainer: darkMode ? "#DDF8F3" : "#0B625A",
      background: darkMode ? "#0B1220" : COLORS.background,
      onBackground: darkMode ? "#F2F6FC" : COLORS.textPrimary,
      surface: darkMode ? "#141E2E" : COLORS.surface,
      surfaceVariant: darkMode ? "#1B293D" : COLORS.surfaceMuted,
      outline: darkMode ? "#2A384C" : COLORS.border,
      outlineVariant: darkMode ? "#2A384C" : COLORS.border,
      error: COLORS.error,
      errorContainer: darkMode ? "#3C1D22" : COLORS.errorLight,
      onErrorContainer: darkMode ? "#FFD9DD" : "#7A1F26",
      onSurface: darkMode ? "#F2F6FC" : COLORS.textPrimary,
      onSurfaceVariant: darkMode ? "#A9B7CA" : COLORS.textSecondary,
    },
  };
};

export const paperTheme = createPaperTheme();
