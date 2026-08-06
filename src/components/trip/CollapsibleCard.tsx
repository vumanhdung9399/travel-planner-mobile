import { COLORS } from "@/src/utils/constants";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";
import { useAppPalette } from "@/src/hook/useAppPalette";

interface Props {
  title: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  iconColor?: string;
  expanded: boolean;
  onToggle: () => void;
  action?: ReactNode;
  children: ReactNode;
}

export default function CollapsibleCard({
  title,
  icon,
  iconColor = COLORS.primary,
  expanded,
  onToggle,
  action,
  children,
}: Props) {
  const palette = useAppPalette();
  return (
    <Surface style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={0}>
      <Pressable
        onPress={onToggle}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.titleRow}>
          <Ionicons name={icon} size={22} color={iconColor} />
          <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
        </View>
        <View style={styles.right}>
          {action}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={palette.textSecondary}
          />
        </View>
      </Pressable>
      {expanded && <View style={styles.content}>{children}</View>}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#3D4E62",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  header: {
    minHeight: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  content: { padding: 16, paddingTop: 4 },
});
