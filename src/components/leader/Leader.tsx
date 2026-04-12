import ConfirmDialog from "@/src/components/ConfirmDialog";
import { api } from "@/src/services/api";
import type { Trip } from "@/src/type/trip";
import type { UserGroup } from "@/src/type/user";
import { COLORS, GROUP_ROLE } from "@/src/utils/constants";
import { getNameFirstLetterUpper } from "@/src/utils/helper";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Avatar,
  Button,
  Checkbox,
  IconButton,
  Surface,
  Text,
} from "react-native-paper";

interface LeaderProps {
  trip: Trip;
  setTrip: (trip: Trip) => void;
  onUpdate?: () => void;
}

const Leader = ({ trip, setTrip, onUpdate }: LeaderProps) => {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [memberModalVisible, setMemberModalVisible] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const members =
    (trip.group?.members?.filter(
      (item) => item.role === GROUP_ROLE.MEMBER,
    ) as UserGroup[]) || [];

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = "Vui lòng nhập tiêu đề";
    }
    if (!content.trim()) {
      newErrors.content = "Vui lòng nhập nội dung";
    }
    if (selectedUserIds.length === 0) {
      newErrors.userIds = "Chọn ít nhất 1 người nhận";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await api.post(`/notifications/add`, {
        title: title.trim(),
        content: content.trim(),
        userIds: selectedUserIds,
        groupId: trip.group?.id,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset form
      setTitle("");
      setContent("");
      setSelectedUserIds([]);
    } catch (err) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleEndTrip = async () => {
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await api.post(`/trips/${trip.id}/close`);
      setTrip({
        ...trip,
        isCloseTrip: true,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUpdate?.();
    } catch (err) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
    if (errors.userIds) {
      setErrors((prev) => ({ ...prev, userIds: "" }));
    }
  };

  const selectAllMembers = () => {
    const allIds = members.map((m) => m.id).filter(Boolean);
    setSelectedUserIds(allIds);
    if (errors.userIds) {
      setErrors((prev) => ({ ...prev, userIds: "" }));
    }
  };

  const deselectAllMembers = () => {
    setSelectedUserIds([]);
  };

  const getSelectedCount = () => {
    return selectedUserIds.length;
  };

  const getSelectedNames = () => {
    if (selectedUserIds.length === 0) return "Chọn người nhận";
    if (selectedUserIds.length === members.length) return "Tất cả thành viên";

    const names = members
      .filter((m) => selectedUserIds.includes(m.id || m.id))
      .map((m) => m.name?.split(" ")[0] || "Thành viên")
      .slice(0, 3);

    if (selectedUserIds.length > 3) {
      return `${names.join(", ")} và ${selectedUserIds.length - 3} người khác`;
    }
    return names.join(", ");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* End Trip Section */}
      <Surface style={styles.card} elevation={0}>
        <Text style={styles.cardTitle}>Kết thúc chuyến đi</Text>
        <Text style={styles.cardDescription}>
          Chuyến đi vẫn đang diễn ra, bạn có muốn kết thúc chuyến đi không?
        </Text>
        <Button
          mode="contained"
          onPress={() => setConfirmOpen(true)}
          disabled={loading}
          buttonColor={COLORS.error}
          style={styles.endTripButton}
          textColor="#fff"
        >
          Kết thúc chuyến đi
        </Button>
      </Surface>

      {/* Create Notification Section */}
      <Surface style={styles.card} elevation={0}>
        <Text style={styles.cardTitle}>Tạo thông báo</Text>
        <Text style={styles.cardDescription}>
          Gửi thông báo đến các thành viên trong nhóm
        </Text>

        <View style={styles.form}>
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Tiêu đề <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.title ? styles.inputError : null]}
              placeholder="Nhập tiêu đề thông báo"
              placeholderTextColor={COLORS.textLight}
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
              }}
              maxLength={100}
            />
            {errors.title ? (
              <Text style={styles.errorText}>{errors.title}</Text>
            ) : null}
          </View>

          {/* Content */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Nội dung <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                errors.content ? styles.inputError : null,
              ]}
              placeholder="Nhập nội dung thông báo"
              placeholderTextColor={COLORS.textLight}
              value={content}
              onChangeText={(text) => {
                setContent(text);
                if (errors.content)
                  setErrors((prev) => ({ ...prev, content: "" }));
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            {errors.content ? (
              <Text style={styles.errorText}>{errors.content}</Text>
            ) : null}
          </View>

          {/* Member Selection */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Người nhận <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                errors.userIds ? styles.inputError : null,
              ]}
              onPress={() => setMemberModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.selectButtonText,
                  selectedUserIds.length === 0 && styles.selectPlaceholder,
                ]}
                numberOfLines={1}
              >
                {getSelectedNames()}
              </Text>
              <View style={styles.selectButtonRight}>
                {selectedUserIds.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>
                      {selectedUserIds.length}
                    </Text>
                  </View>
                )}
                <IconButton
                  icon="chevron-down"
                  size={20}
                  iconColor={COLORS.textSecondary}
                />
              </View>
            </TouchableOpacity>
            {errors.userIds ? (
              <Text style={styles.errorText}>{errors.userIds}</Text>
            ) : null}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={COLORS.primaryGradient as readonly [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitButtonGradient}
            >
              <Text style={styles.submitText}>Gửi thông báo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Surface>

      {/* Member Selection Modal */}
      <Modal
        visible={memberModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMemberModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn người nhận</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setMemberModalVisible(false)}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={selectAllMembers}>
                <Text style={styles.modalActionText}>Chọn tất cả</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deselectAllMembers}>
                <Text style={[styles.modalActionText, { color: COLORS.error }]}>
                  Bỏ chọn
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const userId = item.id || item.id;
                const isSelected = selectedUserIds.includes(userId);
                return (
                  <TouchableOpacity
                    style={styles.memberItem}
                    onPress={() => toggleMember(userId)}
                  >
                    {item.avatar ? (
                      <Avatar.Image source={{ uri: item.avatar }} size={40} />
                    ) : (
                      <Avatar.Text
                        size={40}
                        label={getNameFirstLetterUpper(item.name || "")}
                        style={styles.memberAvatar}
                      />
                    )}
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{item.name}</Text>
                      {item.email && (
                        <Text style={styles.memberEmail}>{item.email}</Text>
                      )}
                    </View>
                    <Checkbox
                      status={isSelected ? "checked" : "unchecked"}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                );
              }}
              style={styles.memberList}
            />

            <View style={styles.modalFooter}>
              <Button
                mode="contained"
                onPress={() => setMemberModalVisible(false)}
                buttonColor={COLORS.primary}
                style={styles.modalDoneButton}
              >
                Xong ({selectedUserIds.length})
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        visible={confirmOpen}
        title="Kết thúc chuyến đi"
        message="Bạn có chắc chắn muốn kết thúc chuyến đi không? Thao tác này không thể hoàn lại."
        type="warning"
        confirmText="Xác nhận"
        cancelText="Hủy"
        loading={loading}
        onConfirm={handleEndTrip}
        onCancel={() => setConfirmOpen(false)}
      />
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
    paddingBottom: 80,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  endTripButton: {
    borderRadius: 12,
    marginTop: 8,
  },
  form: {
    marginTop: 8,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 6,
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectButtonText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  selectPlaceholder: {
    color: COLORS.textLight,
  },
  selectButtonRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  submitButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  memberList: {
    maxHeight: 300,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  memberAvatar: {
    backgroundColor: COLORS.primary,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalDoneButton: {
    borderRadius: 12,
  },
});

export default Leader;
