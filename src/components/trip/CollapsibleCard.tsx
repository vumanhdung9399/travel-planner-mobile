import { COLORS } from "@/src/utils/constants";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";

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
  return (
    <Surface style={styles.card} elevation={1}>
      <Pressable
        onPress={onToggle}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.titleRow}>
          <Ionicons name={icon} size={22} color={iconColor} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.right}>
          {action}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={COLORS.textSecondary}
          />
        </View>
      </Pressable>
      {expanded && <View style={styles.content}>{children}</View>}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
  },
  header: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  content: { padding: 16, paddingTop: 4 },
});
