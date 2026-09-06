import { useAppPalette } from "@/src/hook/useAppPalette";
import { APP_TYPOGRAPHY } from "@/src/utils/constants";
import type { ComponentProps } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";

type TextProps = ComponentProps<typeof Text>;


export function PageKicker({ style, ...props }: TextProps) {
  const palette = useAppPalette();
  return <Text {...props} style={[styles.kicker, { color: palette.primary }, style]} />;
}

export function PageTitle({ style, ...props }: TextProps) {
  const palette = useAppPalette();
  const { width } = useWindowDimensions();
  const fontSize = Math.min(36, Math.max(29, width * 0.08));
  return (
    <Text
      {...props}
      style={[styles.pageTitle, { color: palette.textPrimary, fontSize, lineHeight: fontSize * 1.08, letterSpacing: fontSize * -0.045 }, style]}
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
    fontSize: APP_TYPOGRAPHY.kickerSize,
    fontWeight: "800",
    letterSpacing: 1.35,
    lineHeight: 15,
    textTransform: "uppercase",
  },
  pageTitle: {
    fontFamily: "Manrope",
    fontSize: APP_TYPOGRAPHY.pageTitleSize,
    fontWeight: "800",
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
