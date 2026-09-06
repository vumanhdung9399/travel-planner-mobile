import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useAppPalette } from "@/src/hook/useAppPalette";


export const EmptyState = ({
  onCreatePress,
  filtered = false,
}: {
  onCreatePress: () => void;
  filtered?: boolean;
}) => {
  const palette = useAppPalette();

  return (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[palette.primaryLight, palette.surfaceMuted]}
        style={styles.emptyIllustration}
      >
        <Text style={styles.emptyEmoji}>👥</Text>
      </LinearGradient>

      <Text
        style={[styles.emptyTitle, { color: palette.textPrimary }]}
      >
        {filtered ? "Không tìm thấy nhóm" : "Bắt đầu nhóm đầu tiên"}
      </Text>
      <Text style={[styles.emptySubtext, { color: palette.textSecondary }]}>
        {filtered
          ? "Thử từ khóa hoặc bộ lọc khác."
          : "Tạo nhóm, mời bạn bè và cùng nhau lên kế hoạch."}
      </Text>

      {!filtered ? (
        <Button
          mode="contained"
          onPress={onCreatePress}
          contentStyle={styles.emptyButtonContent}
          style={styles.emptyButton}
          labelStyle={styles.emptyButtonLabel}
        >
          Tạo nhóm mới
        </Button>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyIllustration: {
    width: 72,
    height: 72,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyButton: {
    borderRadius: 10,
    overflow: "hidden",
  },
  emptyButtonContent: {
    paddingHorizontal: 24,
    paddingVertical: 6,
  },
  emptyButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
