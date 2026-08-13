import { COLORS } from "@/src/utils/constants";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, type ReactNode } from "react";
import {
  ActivityIndicator,
  type DimensionValue,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface TripDetailFormSheetProps {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onSubmit: () => boolean | void | Promise<boolean | void>;
  loading?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  closeOnSubmitSuccess?: boolean;
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
  closeOnSubmitSuccess = false,
  height = "88%",
  footerTop,
}: TripDetailFormSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const isSubmitDisabled = loading || submitDisabled;
  const translateY = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const isClosing = useSharedValue(false);

  const finishClose = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const animateClose = useCallback(() => {
    if (isClosing.value) return;

    isClosing.value = true;
    translateY.value = withTiming(
      screenHeight,
      { duration: 240 },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)();
        }
      },
    );
  }, [finishClose, isClosing, screenHeight, translateY]);

  const handleSubmitPress = useCallback(() => {
    if (!closeOnSubmitSuccess) {
      void onSubmit();
      return;
    }

    try {
      void Promise.resolve(onSubmit())
        .then((succeeded) => {
          if (succeeded !== false) {
            animateClose();
          }
        })
        .catch(() => undefined);
    } catch {
      // The submit handler owns validation and error feedback.
    }
  }, [animateClose, closeOnSubmitSuccess, onSubmit]);

  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-5, 5])
        .onBegin(() => {
          dragStartY.value = translateY.value;
        })
        .onUpdate((event) => {
          translateY.value = Math.max(
            0,
            dragStartY.value + event.translationY,
          );
        })
        .onEnd((event) => {
          const draggedFarEnough = translateY.value > screenHeight * 0.16;
          const flickedDown =
            event.translationY > 12 && event.velocityY > 850;

          if (draggedFarEnough || flickedDown) {
            isClosing.value = true;
            translateY.value = withTiming(
              screenHeight,
              { duration: 220 },
              (finished) => {
                if (finished) {
                  runOnJS(finishClose)();
                }
              },
            );
            return;
          }

          translateY.value = withSpring(0, {
            damping: 22,
            stiffness: 260,
          });
        })
        .onFinalize((_event, success) => {
          if (!success && !isClosing.value) {
            translateY.value = withSpring(0, {
              damping: 22,
              stiffness: 260,
            });
          }
        }),
    [
      dragStartY,
      finishClose,
      isClosing,
      screenHeight,
      translateY,
    ],
  );

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, screenHeight * 0.72],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <GestureHandlerRootView style={styles.overlay}>
      <Animated.View
        pointerEvents="none"
        style={[styles.backdrop, backdropAnimatedStyle]}
      />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={animateClose}
        accessibilityLabel="Đóng biểu mẫu"
      />

      <Animated.View
        style={[
          styles.sheet,
          { height, backgroundColor: theme.colors.surface },
          sheetAnimatedStyle,
        ]}
      >
        <View style={styles.header}>
          <GestureDetector gesture={dragGesture}>
            <Animated.View
              style={styles.handleTouchArea}
              accessibilityLabel="Kéo xuống để đóng"
            >
              <View
                style={[
                  styles.handle,
                  { backgroundColor: theme.colors.outlineVariant },
                ]}
              />
            </Animated.View>
          </GestureDetector>
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
                onPress={animateClose}
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
                onPress={handleSubmitPress}
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
      </Animated.View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
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
    paddingBottom: 15,
  },
  handleTouchArea: {
    width: 84,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.border,
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
