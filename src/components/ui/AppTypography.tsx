import { useAppPalette } from "@/src/hook/useAppPalette";
import { APP_TYPOGRAPHY, COLORS } from "@/src/utils/constants";
import type { ComponentProps } from "react";
import { Platform, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

type TextProps = ComponentProps<typeof Text>;

const serifFont = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "serif",
});

export function PageKicker({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.kicker, style]} />;
}

export function PageTitle({ style, ...props }: TextProps) {
  const palette = useAppPalette();
  return (
    <Text
      {...props}
      style={[styles.pageTitle, { color: palette.textPrimary }, style]}
    />
  );
}

export function PageSubtitle({ style, ...props }: TextProps) {
  const palette = useAppPalette();
  return (
    <Text
      {...props}
      style={[styles.pageSubtitle, { color: palette.textSecondary }, style]}
    />
  );
}

export function SectionTitle({ style, ...props }: TextProps) {
  const palette = useAppPalette();
  return (
    <Text
      {...props}
      style={[styles.sectionTitle, { color: palette.textPrimary }, style]}
    />
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: COLORS.primary,
    fontSize: APP_TYPOGRAPHY.kickerSize,
    fontWeight: "800",
    letterSpacing: 1.35,
    lineHeight: 15,
    textTransform: "uppercase",
  },
  pageTitle: {
    fontFamily: serifFont,
    fontSize: APP_TYPOGRAPHY.pageTitleSize,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  pageSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: APP_TYPOGRAPHY.sectionTitleSize,
    fontWeight: "800",
    letterSpacing: -0.25,
    lineHeight: 24,
  },
});
