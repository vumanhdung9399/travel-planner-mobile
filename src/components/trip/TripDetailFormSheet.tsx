import { COLORS } from "@/src/utils/constants";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  type DimensionValue,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, useTheme } from "react-native-paper";

interface TripDetailFormSheetProps {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  loading?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  height?: DimensionValue;
  footerTop?: ReactNode;
}

/** Shared presentation for create/edit actions opened from Trip Detail. */
export default function TripDetailFormSheet({
  title,
  children,
  onCancel,
  onSubmit,
  loading = false,
  submitDisabled = false,
  submitLabel = "Lưu",
  height = "88%",
  footerTop,
}: TripDetailFormSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const isSubmitDisabled = loading || submitDisabled;

  return (
    <View style={styles.overlay}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onCancel}
        accessibilityLabel="Đóng biểu mẫu"
      />

      <View
        style={[styles.sheet, { height, backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.handle,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />
          <Text
            style={[styles.title, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.body}>{children}</View>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom, 12),
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.outlineVariant,
              },
            ]}
          >
            {footerTop ? <View style={styles.footerTop}>{footerTop}</View> : null}
            <View style={styles.footerActions}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                onPress={onCancel}
                disabled={loading}
                activeOpacity={0.78}
              >
                <Text
                  style={[styles.cancelText, { color: theme.colors.onSurface }]}
                >
                  Hủy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitDisabled && styles.submitButtonDisabled,
                ]}
                onPress={onSubmit}
                disabled={isSubmitDisabled}
                activeOpacity={0.84}
              >
                <LinearGradient
                  colors={[COLORS.primary, "#0A73EE"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>{submitLabel}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.46)",
  },
  sheet: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 18,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 9,
    paddingBottom: 15,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  title: {
    maxWidth: "88%",
    color: COLORS.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.25,
  },
  keyboardView: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingTop: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  footerTop: {
    marginHorizontal: -16,
    marginTop: -14,
    marginBottom: 14,
  },
  footerActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  submitButton: {
    flex: 1,
    height: 52,
    borderRadius: 13,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
