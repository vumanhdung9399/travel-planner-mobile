import { Ionicons } from "@expo/vector-icons"; // Hoặc Lucide-react-native
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CommonHeaderProps {
  title?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export const CommonHeader = ({
  title,
  onBack,
  rightElement,
}: CommonHeaderProps) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container]}>
      <View style={styles.content}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
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
    // backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
  },
  content: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: {
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  titleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    maxWidth: "70%",
  },
  rightContainer: {
    zIndex: 10,
    minWidth: 40,
    alignItems: "flex-end",
  },
});
