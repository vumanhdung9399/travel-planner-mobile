import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";
import { COLORS, UI_RADIUS } from "@/src/utils/constants";

export const createPaperTheme = (darkMode = false): MD3Theme => {
  const base = darkMode ? MD3DarkTheme : MD3LightTheme;
  const primary = darkMode ? "#69C7AA" : COLORS.primary;
  const secondary = darkMode ? "#FF927D" : COLORS.secondary;

  return {
    ...base,
    roundness: UI_RADIUS.card / 4,
    colors: {
      ...base.colors,
      primary,
      onPrimary: darkMode ? "#06271F" : "#FFFFFF",
      primaryContainer: darkMode ? "#173B33" : COLORS.primaryLight,
      onPrimaryContainer: darkMode ? "#C9F3E4" : COLORS.primaryDark,
      secondary,
      onSecondary: darkMode ? "#34110A" : "#FFFFFF",
      secondaryContainer: darkMode ? "#3C1D22" : COLORS.errorLight,
      onSecondaryContainer: darkMode ? "#FFD9D0" : "#873B2D",
      background: darkMode ? "#0C1714" : COLORS.background,
      onBackground: darkMode ? "#F3F7F4" : COLORS.textPrimary,
      surface: darkMode ? "#14231F" : COLORS.surface,
      surfaceVariant: darkMode ? "#101D19" : COLORS.surfaceMuted,
      outline: darkMode ? "#294139" : COLORS.border,
      outlineVariant: darkMode ? "#294139" : COLORS.border,
      error: darkMode ? "#F18471" : COLORS.error,
      errorContainer: darkMode ? "#3C1D22" : COLORS.errorLight,
      onErrorContainer: darkMode ? "#FFD9DD" : "#7A2A20",
      onSurface: darkMode ? "#F3F7F4" : COLORS.textPrimary,
      onSurfaceVariant: darkMode ? "#A9BAB4" : COLORS.textSecondary,
    },
  };
};

export const paperTheme = createPaperTheme();
