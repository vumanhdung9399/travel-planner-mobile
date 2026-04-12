import { COLORS } from "@/src/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Surface, Text } from "react-native-paper";

export type ConfirmDialogType = "danger" | "warning" | "success" | "info";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmDialogType;
  confirmColor?: string;
  cancelColor?: string;
  loading?: boolean;
  showIcon?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  type = "danger",
  confirmColor,
  cancelColor,
  loading = false,
  showIcon = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const getTypeConfig = (): {
    icon: string;
    iconBgColor: string;
    iconColor: string;
    defaultConfirmColor: string;
    gradientColors: readonly [string, string];
  } => {
    switch (type) {
      case "danger":
        return {
          icon: "alert-circle",
          iconBgColor: "#FEF2F2",
          iconColor: COLORS.error,
          defaultConfirmColor: COLORS.error,
          gradientColors: ["#EF4444", "#DC2626"] as const,
        };
      case "warning":
        return {
          icon: "warning",
          iconBgColor: "#FFFBEB",
          iconColor: "#F59E0B",
          defaultConfirmColor: "#F59E0B",
          gradientColors: ["#F59E0B", "#D97706"] as const,
        };
      case "success":
        return {
          icon: "checkmark-circle",
          iconBgColor: "#ECFDF5",
          iconColor: COLORS.success,
          defaultConfirmColor: COLORS.success,
          gradientColors: ["#10B981", "#059669"] as const,
        };
      case "info":
      default:
        return {
          icon: "information-circle",
          iconBgColor: "#EFF6FF",
          iconColor: COLORS.info,
          defaultConfirmColor: COLORS.primary,
          gradientColors: COLORS.primaryGradient as readonly [string, string],
        };
    }
  };

  const typeConfig = getTypeConfig();

  const finalConfirmColor = confirmColor || typeConfig.defaultConfirmColor;

  const getGradientFromColor = (color: string): readonly [string, string] => {
    const darkenColor = (hex: string, percent: number): string => {
      const num = parseInt(hex.replace("#", ""), 16);
      const r = (num >> 16) - Math.round((num >> 16) * percent);
      const g =
        ((num >> 8) & 0x00ff) - Math.round(((num >> 8) & 0x00ff) * percent);
      const b = (num & 0x0000ff) - Math.round((num & 0x0000ff) * percent);
      return `#${((1 << 24) + (Math.max(r, 0) << 16) + (Math.max(g, 0) << 8) + Math.max(b, 0)).toString(16).slice(1)}`;
    };

    return [color, darkenColor(color, 0.15)] as const;
  };

  const confirmGradientColors = confirmColor
    ? getGradientFromColor(confirmColor)
    : typeConfig.gradientColors;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
    >
      <View style={styles.overlay}>
        <Surface style={styles.dialog}>
          {showIcon && (
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[typeConfig.iconBgColor, typeConfig.iconBgColor]}
                style={styles.iconGradient}
              >
                <Ionicons
                  name={typeConfig.icon as any}
                  size={32}
                  color={typeConfig.iconColor}
                />
              </LinearGradient>
            </View>
          )}

          <Text style={styles.title}>{title}</Text>

          {message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                cancelColor && { borderColor: cancelColor },
              ]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text
                style={[
                  styles.cancelText,
                  cancelColor && { color: cancelColor },
                ]}
              >
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                loading && styles.confirmButtonDisabled,
              ]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={confirmGradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>{confirmText}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    backgroundColor: "#fff",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  confirmButtonGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});

export default ConfirmDialog;
