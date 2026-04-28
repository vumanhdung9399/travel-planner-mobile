import { COLORS } from "@/src/utils/constants";
import { getNameFirstLetterUpper } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface AvatarPickerProps {
  uri: string;
  onPickImage: () => void;
  loading?: boolean;
  name?: string;
}

export const AvatarPicker = ({
  uri,
  onPickImage,
  loading = false,
  name = "",
}: AvatarPickerProps) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPickImage}
        disabled={loading}
        style={styles.avatarWrapper}
      >
        {/* Avatar Image hoặc Placeholder */}
        {uri ? (
          <Image source={{ uri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>
              {getNameFirstLetterUpper(name || "U")}
            </Text>
          </View>
        )}

        {/* Loading Indicator hoặc Camera Button */}
        <View style={styles.cameraButton}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <LinearGradient
              colors={COLORS.primaryGradient as readonly [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cameraButtonGradient}
            >
              <Ionicons name="camera" size={16} color="#fff" />
            </LinearGradient>
          )}
        </View>
      </TouchableOpacity>

      {/* Hint text */}
      <TouchableOpacity onPress={onPickImage} disabled={loading}>
        <Text style={styles.hint}>
          {loading ? "Đang tải lên..." : "Thay đổi ảnh đại diện"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    overflow: "hidden",
  },
  cameraButtonGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
});
