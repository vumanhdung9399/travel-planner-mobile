import { CommonHeader } from "@/src/components/layout/CommonHeader";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/auth.store";
import { useGroupStore } from "@/src/store/group.store";
import { COLORS } from "@/src/utils/constants";
import { getNameFirstLetterUpper } from "@/src/utils/helper";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Avatar, Button, Chip, Text } from "react-native-paper";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface SelectedMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

const AddMembersScreen = () => {
  const router = useRouter();
  const { group } = useGroupStore();
  const { user: currentUser } = useAuthStore();
  const { id: groupId } = useLocalSearchParams<{ id: string }>();

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      setSelectedMembers([]);
      setUsers([]);
      setSearchQuery("");
      return () => {};
    }, []),
  );

  const existingMemberIds = useMemo(() => {
    if (!group?.members) return new Set<string>();
    return new Set(group.members.map((m) => m.user?.id).filter(Boolean));
  }, [group?.members]);

  const existingMemberEmails = useMemo(() => {
    if (!group?.members) return new Set<string>();
    return new Set(group.members.map((m) => m.user?.email).filter(Boolean));
  }, [group?.members]);

  const isUserAlreadyMember = (user: User): boolean => {
    return (
      existingMemberIds.has(user.id) || existingMemberEmails.has(user.email)
    );
  };

  const isCurrentUser = (userId: string): boolean => {
    return currentUser?.id === userId;
  };

  const getDisabledReason = (user: User): string | null => {
    if (isCurrentUser(user.id)) {
      return "Là bạn";
    }
    if (isUserAlreadyMember(user)) {
      return "Đã trong nhóm";
    }
    return null;
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      await searchUsers(searchQuery);
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const searchUsers = async (query: string) => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError("");
      const res = await api.get<User[]>(
        `/users/search?query=${encodeURIComponent(query)}`,
      );
      const filteredUsers = res.data.filter(
        (user) => !selectedMembers.some((m) => m.id === user.id),
      );
      setUsers(filteredUsers);
    } catch (err) {
      console.error(err);
      setError("Không thể tìm kiếm người dùng");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = (user: User) => {
    if (isUserAlreadyMember(user)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError("Người dùng này đã là thành viên của nhóm");
      return;
    }

    if (isCurrentUser(user.id)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError("Bạn đã là thành viên của nhóm");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMembers((prev) => [...prev, user]);
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    setSearchQuery("");
    setError("");
    Keyboard.dismiss();
  };

  const handleRemoveMember = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const removed = selectedMembers.find((m) => m.id === userId);
    setSelectedMembers((prev) => prev.filter((m) => m.id !== userId));
    if (removed) {
      setUsers((prev) => [...prev, removed]);
    }
  };

  const handleAddAll = async () => {
    if (selectedMembers.length === 0 || !groupId) return;

    const invalidMembers = selectedMembers.filter(
      (m) => isUserAlreadyMember(m) || isCurrentUser(m.id),
    );

    if (invalidMembers.length > 0) {
      setError("Một số thành viên đã có trong nhóm, vui lòng kiểm tra lại");
      return;
    }

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const promises = selectedMembers.map((member) =>
        api.post(`/groups/${groupId}/members`, { contact: member.email }),
      );

      await Promise.all(promises);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.error(err);
      setError("Thêm thành viên thất bại, vui lòng thử lại");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const disabledReason = getDisabledReason(item);
    const isDisabled = disabledReason !== null;

    return (
      <TouchableOpacity
        style={[styles.userItem, isDisabled && styles.userItemDisabled]}
        onPress={() => !isDisabled && handleSelectMember(item)}
        activeOpacity={0.7}
        disabled={isDisabled}
      >
        {item.avatar ? (
          <Avatar.Image source={{ uri: item.avatar }} size={48} />
        ) : (
          <Avatar.Text
            size={48}
            label={getNameFirstLetterUpper(item.name)}
            style={[styles.avatar, isDisabled && styles.avatarDisabled]}
          />
        )}
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={[styles.userName, isDisabled && styles.textDisabled]}>
              {item.name}
            </Text>
            {isCurrentUser(item.id) && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>Bạn</Text>
              </View>
            )}
          </View>
          <Text style={[styles.userEmail, isDisabled && styles.textDisabled]}>
            {item.email}
          </Text>
        </View>
        {isDisabled ? (
          <View style={styles.disabledButton}>
            <Text style={styles.disabledButtonText}>{disabledReason}</Text>
          </View>
        ) : (
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (searchQuery.trim() && users.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Không tìm thấy</Text>
          <Text style={styles.emptySubtext}>
            Không tìm thấy người dùng nào với từ khóa "{searchQuery}"
          </Text>
        </View>
      );
    }

    if (!searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyTitle}>Tìm kiếm thành viên</Text>
          <Text style={styles.emptySubtext}>
            Nhập email hoặc số điện thoại để tìm kiếm người dùng
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader title="Thêm thành viên" />

      <View style={styles.content}>
        {/* Selected Members */}
        {selectedMembers.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.selectedTitle}>
              Đã chọn ({selectedMembers.length})
            </Text>
            <FlatList
              data={selectedMembers}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.selectedList}
              renderItem={({ item }) => (
                <Chip
                  mode="outlined"
                  avatar={
                    item.avatar ? (
                      <Avatar.Image source={{ uri: item.avatar }} size={24} />
                    ) : (
                      <Avatar.Text
                        size={24}
                        label={getNameFirstLetterUpper(item.name)}
                      />
                    )
                  }
                  onClose={() => handleRemoveMember(item.id)}
                  style={styles.chip}
                  textStyle={styles.chipText}
                >
                  {item.name.split(" ")[0]}
                </Chip>
              )}
            />
          </View>
        )}

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.textLight}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Nhập số điện thoại hoặc email..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Error */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Search Results */}
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      {/* Bottom Button */}
      {selectedMembers.length > 0 && (
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleAddAll}
            loading={submitting}
            disabled={submitting}
            buttonColor={COLORS.primary}
            contentStyle={styles.addButtonContent}
            style={styles.addButton}
          >
            Thêm {selectedMembers.length} thành viên
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  selectedSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  selectedList: {
    paddingRight: 20,
  },
  chip: {
    marginRight: 8,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: 13,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginVertical: 8,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 8,
    marginBottom: 4,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 20,
    flexGrow: 1,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userItemDisabled: {
    opacity: 0.6,
  },
  avatar: {
    backgroundColor: COLORS.primary,
  },
  avatarDisabled: {
    backgroundColor: COLORS.textLight,
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  textDisabled: {
    color: COLORS.textLight,
  },
  youBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  disabledButton: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  disabledButtonText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  addButton: {
    borderRadius: 16,
  },
  addButtonContent: {
    paddingVertical: 8,
  },
});

export default AddMembersScreen;
