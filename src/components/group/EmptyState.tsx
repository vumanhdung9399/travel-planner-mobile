import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

export const EmptyState = ({
  onCreatePress,
}: {
  onCreatePress: () => void;
}) => (
  <View style={styles.emptyContainer}>
    <LinearGradient
      colors={["#EEF2FF", "#F8FAFC"]}
      style={styles.emptyIllustration}
    >
      <Text style={styles.emptyEmoji}>👥</Text>
    </LinearGradient>

    <Text style={styles.emptyTitle}>Chưa có nhóm nào</Text>
    <Text style={styles.emptySubtext}>
      Tạo nhóm đầu tiên để bắt đầu chia sẻ chi tiêu cùng bạn bè
    </Text>

    <Button
      mode="contained"
      onPress={onCreatePress}
      contentStyle={styles.emptyButtonContent}
      style={styles.emptyButton}
      labelStyle={styles.emptyButtonLabel}
      buttonColor="#4F46E5"
    >
      Tạo nhóm ngay
    </Button>
  </View>
);

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyIllustration: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyButton: {
    borderRadius: 16,
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
