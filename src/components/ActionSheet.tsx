import React, { useEffect, useRef } from "react";
import { COLORS, UI_RADIUS } from "@/src/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useTheme } from "react-native-paper";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ActionSheet({ open, onClose, actions }: any) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const theme = useTheme();

  // Hàm thực hiện hiệu ứng đóng mượt mà trước khi gọi onClose
  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose()); // Chỉ gọi onClose sau khi animation chạy xong
  };

  useEffect(() => {
    if (open) {
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [open]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 120 || gesture.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <Modal
      transparent
      visible={open}
      onRequestClose={handleClose}
      animationType="fade"
    >
      <View style={styles.container}>
        {/* Overlay mờ dần cùng Modal */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View
            style={[
              styles.dragIndicator,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          {actions.map((item: any, index: number) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.item,
                { borderBottomColor: theme.colors.outlineVariant },
                index === actions.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => {
                item.onPress();
                handleClose();
              }}
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
      </View>
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
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  dragIndicator: {
    width: 36,
    height: 5,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginVertical: 12,
    borderRadius: 3,
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
