import ConfirmDialog from '@/src/components/ConfirmDialog';
import { api } from '@/src/services/api';
import { taskApi } from '@/src/services/task';
import { useAuthStore } from '@/src/store/auth.store';
import type { Trip } from '@/src/type/trip';
import type { TripTask } from '@/src/type/task';
import type { UserGroup } from '@/src/type/user';
import { COLORS } from '@/src/utils/constants';
import { getNameFirstLetterUpper } from '@/src/utils/helper';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Avatar, Checkbox, Text } from 'react-native-paper';
import { useAppPalette } from '@/src/hook/useAppPalette';

interface LeaderProps {
  trip: Trip;
  setTrip: (trip: Trip) => void;
  onUpdate?: () => void;
  onOpenTasks?: () => void;
  isActive?: boolean;
}

const Leader = ({ trip, setTrip, onUpdate, onOpenTasks, isActive }: LeaderProps) => {
  const palette = useAppPalette();
  const currentUser = useAuthStore((state) => state.user);
  const [tasks, setTasks] = useState<TripTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const allMembers = (trip.group?.members || []) as UserGroup[];
  const recipients = allMembers.filter((member) => member.id !== currentUser?.id);
  const completedCount = tasks.filter((task) => task.isCompleted).length;
  const recentTasks = useMemo(() => tasks.slice(0, 3), [tasks]);

  const loadTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      const { data } = await taskApi.list(trip.id);
      setTasks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setTasksLoading(false);
    }
  }, [trip.id]);

  useEffect(() => {
    if (isActive !== false) void loadTasks();
  }, [isActive, loadTasks]);

  const handleEndTrip = async () => {
    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await api.post(`/trips/${trip.id}/close`);
      setTrip({ ...trip, isCloseTrip: true });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUpdate?.();
    } catch (error) {
      console.error(error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const validateNotification = () => {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = 'Vui lòng nhập tiêu đề';
    if (!content.trim()) nextErrors.content = 'Vui lòng nhập nội dung';
    if (!selectedUserIds.length) nextErrors.userIds = 'Chọn ít nhất 1 người nhận';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmitNotification = async () => {
    if (!validateNotification()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    try {
      setLoading(true);
      await api.post('/notifications/add', {
        title: title.trim(),
        content: content.trim(),
        userIds: selectedUserIds,
        groupId: trip.group?.id,
      });
      setTitle('');
      setContent('');
      setSelectedUserIds([]);
      setNotificationOpen(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error(error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = (userId: string) => {
    setSelectedUserIds((current) => current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]);
    setErrors((current) => ({ ...current, userIds: '' }));
  };

  const selectedNames = selectedUserIds.length === 0
    ? 'Chọn người nhận'
    : selectedUserIds.length === recipients.length
      ? 'Tất cả thành viên'
      : recipients.filter((member) => selectedUserIds.includes(member.id)).map((member) => member.name).join(', ');

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statTitleRow}>
              <Ionicons name="people-outline" size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>{allMembers.length} thành viên</Text>
            </View>
            <View style={styles.avatarStack}>
              {allMembers.slice(0, 4).map((member, index) => (
                member.avatar ? (
                  <Image key={member.id} source={{ uri: member.avatar }} style={[styles.stackAvatar, { marginLeft: index ? -9 : 0, zIndex: 5 - index }]} />
                ) : (
                  <View key={member.id} style={[styles.stackAvatar, styles.stackAvatarFallback, { marginLeft: index ? -9 : 0, zIndex: 5 - index }]}>
                    <Text style={styles.avatarInitial}>{getNameFirstLetterUpper(member.name || '')}</Text>
                  </View>
                )
              ))}
              {allMembers.length > 4 && <View style={[styles.stackAvatar, styles.moreAvatar, { marginLeft: -9 }]}><Text style={styles.moreText}>+{allMembers.length - 4}</Text></View>}
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTitleRow}>
              <Ionicons name="checkmark-circle-outline" size={25} color={COLORS.success} />
              <Text style={styles.statValue}>{tasks.length} việc cần làm</Text>
            </View>
            <Text style={styles.completedText}>{completedCount} đã hoàn thành</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Phân công gần đây</Text>
        <View style={styles.taskList}>
          {tasksLoading ? (
            <ActivityIndicator style={styles.taskLoading} color={COLORS.primary} />
          ) : recentTasks.length ? recentTasks.map((task) => (
            <TouchableOpacity key={task.id} activeOpacity={0.72} onPress={onOpenTasks}
              style={styles.taskRow}>
              <View style={[styles.taskIcon, task.isCompleted && styles.taskIconDone]}>
                <Ionicons name={task.isCompleted ? 'checkmark' : 'clipboard-outline'} size={22} color={COLORS.secondary} />
              </View>
              <View style={styles.taskBody}>
                <Text style={[styles.taskTitle, task.isCompleted && styles.taskTitleDone]} numberOfLines={1}>{task.title}</Text>
                <Text style={styles.taskMeta} numberOfLines={1}>{task.assignee ? `Giao cho ${task.assignee.name}` : 'Chưa giao cho ai'}</Text>
              </View>
              <View style={styles.taskRight}>
                <View style={[styles.statusPill, task.isCompleted ? styles.donePill : styles.doingPill]}>
                  <Text style={[styles.statusText, task.isCompleted ? styles.doneText : styles.doingText]}>{task.isCompleted ? 'Hoàn thành' : 'Đang làm'}</Text>
                </View>
                <Text style={styles.taskDate}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={21} color={COLORS.textLight} />
            </TouchableOpacity>
          )) : (
            <View style={styles.emptyTasks}>
              <Ionicons name="clipboard-outline" size={28} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Chưa có phân công nào</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.addTaskButton} onPress={onOpenTasks} activeOpacity={0.75}>
          <Ionicons name="add" size={23} color={COLORS.primary} />
          <Text style={styles.addTaskText}>Thêm việc cần làm</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.notificationButton} onPress={() => setNotificationOpen(true)} activeOpacity={0.75}>
          <View style={styles.notificationIcon}><Ionicons name="notifications-outline" size={22} color={COLORS.primary} /></View>
          <View style={styles.actionBody}>
            <Text style={styles.notificationTitle}>Tạo thông báo</Text>
            <Text style={styles.actionSubtitle}>Gửi cập nhật đến các thành viên</Text>
          </View>
          <Ionicons name="chevron-forward" size={21} color={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.endTripCard} onPress={() => setConfirmOpen(true)} disabled={loading} activeOpacity={0.72}>
          <View style={styles.endTripIcon}><Ionicons name="trash-outline" size={25} color={COLORS.error} /></View>
          <View style={styles.actionBody}>
            <Text style={styles.endTripTitle}>Kết thúc chuyến đi</Text>
            <Text style={styles.actionSubtitle}>Lưu lại dữ liệu và đóng chuyến đi</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={COLORS.error} />
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={notificationOpen} transparent animationType="slide" onRequestClose={() => setNotificationOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setNotificationOpen(false)}>
          <Pressable style={styles.notificationSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View><Text style={styles.sheetTitle}>Tạo thông báo</Text><Text style={styles.sheetSubtitle}>Gửi đến thành viên trong chuyến đi</Text></View>
              <TouchableOpacity onPress={() => setNotificationOpen(false)} style={styles.closeButton}><Ionicons name="close" size={21} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={styles.label}>Tiêu đề</Text>
            <TextInput value={title} onChangeText={(value) => { setTitle(value); setErrors((current) => ({ ...current, title: '' })); }}
              placeholder="Nhập tiêu đề thông báo" placeholderTextColor={COLORS.textLight} style={[styles.input, errors.title && styles.inputError]} />
            {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
            <Text style={styles.label}>Nội dung</Text>
            <TextInput value={content} onChangeText={(value) => { setContent(value); setErrors((current) => ({ ...current, content: '' })); }}
              placeholder="Nhập nội dung" placeholderTextColor={COLORS.textLight} multiline textAlignVertical="top"
              style={[styles.input, styles.textArea, errors.content && styles.inputError]} />
            {errors.content ? <Text style={styles.errorText}>{errors.content}</Text> : null}
            <Text style={styles.label}>Người nhận</Text>
            <TouchableOpacity style={[styles.selectButton, errors.userIds && styles.inputError]} onPress={() => setMemberModalVisible(true)}>
              <Text style={[styles.selectText, !selectedUserIds.length && styles.placeholder]} numberOfLines={1}>{selectedNames}</Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            {errors.userIds ? <Text style={styles.errorText}>{errors.userIds}</Text> : null}
            <TouchableOpacity style={[styles.sendButton, loading && styles.disabled]} onPress={handleSubmitNotification} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="paper-plane-outline" size={19} color="#fff" /><Text style={styles.sendText}>Gửi thông báo</Text></>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={memberModalVisible} transparent animationType="slide" onRequestClose={() => setMemberModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.memberSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.memberHeader}>
              <Text style={styles.sheetTitle}>Chọn người nhận</Text>
              <TouchableOpacity onPress={() => setSelectedUserIds(recipients.map((member) => member.id))}><Text style={styles.selectAllText}>Chọn tất cả</Text></TouchableOpacity>
            </View>
            <FlatList data={recipients} keyExtractor={(item) => item.id} renderItem={({ item }) => {
              const selected = selectedUserIds.includes(item.id);
              return <TouchableOpacity style={styles.memberRow} onPress={() => toggleRecipient(item.id)}>
                {item.avatar ? <Avatar.Image source={{ uri: item.avatar }} size={40} /> : <Avatar.Text size={40} label={getNameFirstLetterUpper(item.name || '')} style={styles.memberAvatar} />}
                <Text style={styles.memberName}>{item.name}</Text>
                <Checkbox status={selected ? 'checked' : 'unchecked'} color={COLORS.primary} />
              </TouchableOpacity>;
            }} />
            <TouchableOpacity style={styles.memberDoneButton} onPress={() => setMemberModalVisible(false)}><Text style={styles.sendText}>Xong ({selectedUserIds.length})</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmDialog visible={confirmOpen} title="Kết thúc chuyến đi"
        message="Bạn có chắc chắn muốn kết thúc chuyến đi không? Thao tác này không thể hoàn lại."
        type="warning" confirmText="Xác nhận" cancelText="Hủy" loading={loading}
        onConfirm={handleEndTrip} onCancel={() => setConfirmOpen(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 12, paddingTop: 14, paddingBottom: 104 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, minHeight: 126, backgroundColor: COLORS.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#3D4E62', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  statTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statValue: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  avatarStack: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  stackAvatar: { width: 35, height: 35, borderRadius: 18, borderWidth: 2, borderColor: '#fff' },
  stackAvatarFallback: { backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 11, fontWeight: '700' },
  moreAvatar: { backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  completedText: { marginTop: 24, color: COLORS.success, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  taskList: { gap: 12 },
  taskLoading: { height: 86, borderRadius: 18, backgroundColor: COLORS.surface },
  taskRow: { minHeight: 84, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#3D4E62', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  taskIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.successLight, alignItems: 'center', justifyContent: 'center' },
  taskIconDone: { backgroundColor: COLORS.successLight },
  taskBody: { flex: 1, minWidth: 0 },
  taskTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  taskTitleDone: { color: COLORS.textSecondary },
  taskMeta: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  taskRight: { alignItems: 'flex-end', gap: 5 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  doingPill: { backgroundColor: COLORS.warningLight },
  donePill: { backgroundColor: COLORS.successLight },
  statusText: { fontSize: 10, fontWeight: '700' },
  doingText: { color: COLORS.warning },
  doneText: { color: COLORS.success },
  taskDate: { fontSize: 11, color: COLORS.textLight },
  emptyTasks: { height: 112, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', gap: 7 },
  emptyText: { fontSize: 12, color: COLORS.textSecondary },
  addTaskButton: { height: 52, marginTop: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#79B9F8', borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: COLORS.surfaceMuted },
  addTaskText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  notificationButton: { minHeight: 76, marginTop: 18, padding: 13, borderRadius: 17, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  notificationIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  actionBody: { flex: 1 },
  notificationTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  actionSubtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  endTripCard: { minHeight: 82, marginTop: 12, padding: 13, borderRadius: 17, backgroundColor: COLORS.errorLight, borderWidth: 1, borderColor: '#F7D8D8', flexDirection: 'row', alignItems: 'center', gap: 12 },
  endTripIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: COLORS.errorLight, alignItems: 'center', justifyContent: 'center' },
  endTripTitle: { fontSize: 14, fontWeight: '700', color: COLORS.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,.48)', justifyContent: 'flex-end' },
  notificationSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 32 },
  memberSheet: { maxHeight: '72%', backgroundColor: COLORS.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 30 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 15 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: COLORS.textPrimary },
  sheetSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 7, marginTop: 9 },
  input: { minHeight: 46, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14, fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.surfaceMuted },
  inputError: { borderColor: COLORS.error },
  textArea: { minHeight: 88, paddingTop: 12 },
  errorText: { color: COLORS.error, fontSize: 11, marginTop: 4 },
  selectButton: { height: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceMuted },
  selectText: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  placeholder: { color: COLORS.textLight },
  sendButton: { height: 50, borderRadius: 14, marginTop: 20, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  disabled: { opacity: 0.55 },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  memberHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  selectAllText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  memberRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  memberAvatar: { backgroundColor: COLORS.primary },
  memberName: { flex: 1, marginLeft: 12, color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  memberDoneButton: { height: 48, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
});

export default Leader;
