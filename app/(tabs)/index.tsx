import { EmptyState } from "@/src/components/group/EmptyState";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import { COLORS } from "@/src/utils/constants";
import { getGreeting } from "@/src/utils/helper";
import ActionSheet from "@components/ActionSheet";
import { useNavigation } from "@react-navigation/native";
import type { Group } from "@src/type/group";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient"; // Cần cài expo-linear-gradient
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";

import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, Surface, Text } from "react-native-paper";

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getListGroup();
    }, []),
  );

  const getListGroup = async () => {
    try {
      setLoading(true);
      const res = await api.get<Group[]>("/groups");
      setGroups(res.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup?.id) return;

    try {
      await api.delete(`/groups/${selectedGroup?.id}`);
      getListGroup();
    } catch (err: any) {
      console.error(err);
    } finally {
    }
  };

  const renderItem = ({ item }: { item: Group }) => (
    <Surface style={styles.cardWrapper} elevation={0}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          router.push(`/groups/${item.id}`);
        }}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedGroup(item);
          setOpenSheet(true);
        }}
        style={styles.cardInner}
      >
        <LinearGradient
          colors={["#22d3ee", "#4ade80"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarLabel}>
            {item.name?.charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>

        <View style={styles.textContainer}>
          <Text style={styles.groupName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.memberBadge}>
            <Text style={styles.memberText}>
              {item.members.length} thành viên
            </Text>
          </View>
        </View>

        <IconButton icon="chevron-right" iconColor="#D1D5DB" size={20} />
      </TouchableOpacity>
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.name || "Bạn thân mến"}</Text>
        </View>
        {groups.length > 0 && (
          <TouchableOpacity
            style={styles.plusButton}
            onPress={() => {
              router.push("/groups/create");
            }}
          >
            <LinearGradient
              colors={COLORS.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.plusGradient}
            >
              <IconButton icon="plus" iconColor="#fff" size={17} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={getListGroup}
            tintColor="#6366f1"
          />
        }
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            Nhóm của bạn ({groups.length})
          </Text>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState onCreatePress={() => setOpenSheet(true)} />
          ) : null
        }
      />

      <ActionSheet
        open={openSheet}
        onClose={() => setOpenSheet(false)}
        actions={[
          ...(selectedGroup?.isCreate
            ? [
                {
                  label: "Sửa nhóm",
                  onPress: () => {
                    router.push(`/groups/${selectedGroup?.id}/edit`);
                    setOpenSheet(false);
                  },
                },
                {
                  label: "Xóa nhóm",
                  color: "#FF4D4D",
                  onPress: () => {
                    handleDelete();
                  },
                },
              ]
            : []),
          {
            label: "Vào nhóm",
            onPress: () => {
              router.push(`/groups/${selectedGroup?.id}`);
            },
          },
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  userName: { fontSize: 24, fontWeight: "800", color: "#1E293B", marginTop: 4 },
  plusButton: { borderRadius: 16, overflow: "hidden" },
  plusGradient: { padding: 4 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  list: { paddingHorizontal: 20, paddingBottom: 40 },

  cardWrapper: {
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLabel: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  textContainer: { flex: 1, marginLeft: 16 },
  groupName: { fontSize: 17, fontWeight: "700", color: "#1E293B" },
  memberBadge: {
    backgroundColor: "#E0E7FF",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  memberText: { fontSize: 11, color: "#4338CA", fontWeight: "600" },
});

export default HomeScreen;
