import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { COLORS, UI_RADIUS } from "@/src/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useTheme } from "react-native-paper";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export default function ActionSheet({ open, onClose, actions }: any) {
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useSharedValue(screenHeight);
  const dragStartY = useSharedValue(0);
  const pendingAction = useRef<(() => void) | null>(null);
  const closing = useRef(false);
  const theme = useTheme();

  const runPendingAction = useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }, []);

  const finishClose = useCallback(() => {
    onClose();
    closing.current = false;
    if (Platform.OS !== "ios") {
      requestAnimationFrame(runPendingAction);
    }
  }, [onClose, runPendingAction]);

  // Chỉ chạy action sau khi sheet đã đóng để tránh chồng native Modal.
  const handleClose = useCallback(
    (afterClose?: () => void) => {
      if (closing.current) return;

      closing.current = true;
      pendingAction.current = afterClose ?? null;
      translateY.value = withTiming(
        screenHeight,
        { duration: 230 },
        (finished) => {
          if (finished) {
            runOnJS(finishClose)();
          }
        },
      );
    },
    [finishClose, screenHeight, translateY],
  );

  useEffect(() => {
    if (open) {
      closing.current = false;
      translateY.value = screenHeight;
      translateY.value = withSpring(0, {
        damping: 22,
        stiffness: 240,
      });
    }
  }, [open, screenHeight, translateY]);

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
          const draggedFarEnough = translateY.value > 96;
          const flickedDown =
            event.translationY > 12 && event.velocityY > 850;

          if (draggedFarEnough || flickedDown) {
            runOnJS(handleClose)();
            return;
          }

          translateY.value = withSpring(0, {
            damping: 22,
            stiffness: 260,
          });
        })
        .onFinalize((_event, success) => {
          if (!success) {
            translateY.value = withSpring(0, {
              damping: 22,
              stiffness: 260,
            });
          }
        }),
    [dragStartY, handleClose, translateY],
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
    <Modal
      transparent
      visible={open}
      onRequestClose={() => handleClose()}
      onDismiss={runPendingAction}
      animationType="none"
    >
      <GestureHandlerRootView style={styles.container}>
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, backdropAnimatedStyle]}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => handleClose()}
          accessibilityLabel="Đóng bảng hành động"
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
            },
            sheetAnimatedStyle,
          ]}
        >
          <GestureDetector gesture={dragGesture}>
            <Animated.View
              style={styles.dragHandle}
              accessibilityLabel="Kéo xuống để đóng"
            >
              <View
                style={[
                  styles.dragIndicator,
                  { backgroundColor: theme.colors.outlineVariant },
                ]}
              />
            </Animated.View>
          </GestureDetector>

          {actions.map((item: any, index: number) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.item,
                { borderBottomColor: theme.colors.outlineVariant },
                index === actions.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => handleClose(item.onPress)}
            >
              <Ionicons
                name={item.icon || "ellipse-outline"}
                size={22}
                color={item.color || theme.colors.onSurfaceVariant}
                style={styles.icon}
              />
              <Text
                style={[
                  styles.text,
                  { color: theme.colors.onSurface },
                  item.color && { color: item.color },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: UI_RADIUS.sheet,
    borderTopRightRadius: UI_RADIUS.sheet,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  dragIndicator: {
    width: 36,
    height: 5,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    borderRadius: 3,
  },
  dragHandle: {
    width: 84,
    minHeight: 44,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  item: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 18,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  text: {
    flex: 1,
    textAlign: "left",
    fontSize: 17,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  icon: {
    width: 34,
    marginRight: 10,
  },
});
