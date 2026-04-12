import type { Trip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import dayjs from "dayjs";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";

interface TripInfoProps {
  trip: Trip;
}

const TripInfo = ({ trip }: TripInfoProps) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Surface style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin chuyến đi</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Tên chuyến đi</Text>
          <Text style={styles.value}>{trip.name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Thời gian</Text>
          <Text style={styles.value}>
            {dayjs(trip.startDate).format("DD/MM/YYYY")} →{" "}
            {dayjs(trip.endDate).format("DD/MM/YYYY")}
          </Text>
        </View>

        {trip.location && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Địa điểm</Text>
            <Text style={styles.value}>{trip.location}</Text>
          </View>
        )}

        {trip.infor && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Mô tả</Text>
            <Text style={styles.value}>{trip.infor}</Text>
          </View>
        )}
      </Surface>

      <Surface style={styles.card}>
        <Text style={styles.cardTitle}>Thành viên</Text>
        <Text style={styles.memberCount}>
          {trip.group.members?.length || 0} thành viên
        </Text>
        {/* Có thể thêm danh sách thành viên ở đây */}
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  memberCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

export default TripInfo;
