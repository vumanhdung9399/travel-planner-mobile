import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  type ViewStyle,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useTheme } from "react-native-paper";
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface DraggableBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  handleColor?: string;
  backdropColor?: string;
  accessibilityLabel?: string;
}

/** Modal bottom sheet with a handle that follows a downward drag. */
export default function DraggableBottomSheet({
  visible,
  onClose,
  children,
  sheetStyle,
  handleColor,
  backdropColor = "rgba(0,0,0,0.45)",
  accessibilityLabel = "Kéo xuống để đóng",
}: DraggableBottomSheetProps) {
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const [rendered, setRendered] = useState(visible);
  const translateY = useSharedValue(screenHeight);
  const dragStartY = useSharedValue(0);
  const closing = useRef(false);

  const finishRequestedClose = useCallback(() => {
    closing.current = false;
    setRendered(false);
    onClose();
  }, [onClose]);

  const finishExternalClose = useCallback(() => {
    closing.current = false;
    setRendered(false);
  }, []);

  const animateOut = useCallback(
    (finish: () => void) => {
      translateY.value = withTiming(
        screenHeight,
        { duration: 230 },
        (finished) => {
          if (finished) {
            runOnJS(finish)();
          }
        },
      );
    },
    [screenHeight, translateY],
  );

  const requestClose = useCallback(() => {
    if (closing.current) return;

    closing.current = true;
    animateOut(finishRequestedClose);
  }, [animateOut, finishRequestedClose]);

  useEffect(() => {
    if (visible) {
      closing.current = false;
      setRendered(true);
      return;
    }

    if (rendered && !closing.current) {
      closing.current = true;
      animateOut(finishExternalClose);
    }
  }, [animateOut, finishExternalClose, rendered, visible]);

  useEffect(() => {
    if (!visible || !rendered) return;

    cancelAnimation(translateY);
    translateY.value = screenHeight;
    translateY.value = withSpring(0, {
      damping: 22,
      stiffness: 240,
    });
  }, [rendered, screenHeight, translateY, visible]);

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
            runOnJS(requestClose)();
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
    [dragStartY, requestClose, screenHeight, translateY],
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
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={requestClose}
    >
      <GestureHandlerRootView style={styles.container}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.backdrop,
            { backgroundColor: backdropColor },
            backdropAnimatedStyle,
          ]}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={requestClose}
          accessibilityLabel="Đóng bảng nội dung"
        />

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.surface },
            sheetStyle,
            sheetAnimatedStyle,
          ]}
        >
          <GestureDetector gesture={dragGesture}>
            <Animated.View
              style={styles.handleTouchArea}
              accessibilityLabel={accessibilityLabel}
            >
              <View
                style={[
                  styles.handle,
                  {
                    backgroundColor:
                      handleColor ?? theme.colors.outlineVariant,
                  },
                ]}
              />
            </Animated.View>
          </GestureDetector>
          {children}
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: "100%",
    maxHeight: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleTouchArea: {
    width: 84,
    height: 44,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
  },
});
