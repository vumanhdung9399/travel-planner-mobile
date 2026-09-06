import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { COLORS } from "@/src/utils/constants";

interface CommonHeaderProps {
  title?: string;
  onBack?: () => void;
  fallbackHref?: Href;
  rightElement?: React.ReactNode;
}

export const CommonHeader = ({
  title,
  onBack,
  fallbackHref = "/",
  rightElement,
}: CommonHeaderProps) => {
  const router = useRouter();
  const theme = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackHref);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.content}>
        <TouchableOpacity
          accessibilityLabel="Quay lại"
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: theme.colors.surfaceVariant }]}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text
            style={[styles.title, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {title || "Chi tiết"}
          </Text>
        </View>

        <View style={styles.rightContainer}>
          {rightElement ? rightElement : <View style={{ width: 28 }} />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  content: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: {
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    maxWidth: "70%",
  },
  rightContainer: {
    zIndex: 10,
    minWidth: 40,
    alignItems: "flex-end",
  },
});
