import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { taskApi } from '../../services/task';
import { useAuthStore } from '../../store/auth.store';
import type { Trip } from '../../type/trip';
import type { TaskFilter, TripTask } from '../../type/task';
import type { UserGroup } from '../../type/user';
import { COLORS } from '../../utils/constants';
import { useAppPalette } from '../../hook/useAppPalette';

const filters: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'mine', label: 'Việc của tôi' },
  { value: 'completed', label: 'Đã hoàn thành' },
];

export default function TaskChecklist({
  trip,
  contentInsetTop = 0,
  onScrollOffsetChange,
}: {
  trip: Trip;
  contentInsetTop?: number;
  onScrollOffsetChange?: (offset: number) => void;
}) {
  const palette = useAppPalette();
  const currentUser = useAuthStore((state) => state.user);
  const [tasks, setTasks] = useState<TripTask[]>([]);
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const members = (trip.group?.members || []) as UserGroup[];
  const completedCount = tasks.filter((task) => task.isCompleted).length;
  const readOnly = trip.isCloseTrip;
  const canManageTasks = trip.isLeader && !readOnly;
  const canToggleTask = (task: TripTask) =>
    !readOnly && (trip.isLeader || task.assigneeId === currentUser?.id);

  useEffect(() => {
    let active = true;
    setLoading(true);
    taskApi.list(trip.id)
      .then(({ data }) => active && setTasks(data))
      .catch(console.error)
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [trip.id]);

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    if (filter === 'mine') return task.assigneeId === currentUser?.id;
    if (filter === 'completed') return task.isCompleted;
    return true;
  }), [currentUser?.id, filter, tasks]);

  const createTask = async () => {
    if (!canManageTasks) return;
    const value = title.trim();
    if (!value || creating) return;
    setCreating(true);
    try {
      const { data } = await taskApi.create(value, trip.id);
      setTasks((current) => [data, ...current]);
      setTitle('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) { console.error(error); }
    finally { setCreating(false); }
  };

  const toggleTaskStatus = async (taskId: string, isCompleted: boolean) => {
    const selectedTask = tasks.find((task) => task.id === taskId);
    if (!selectedTask || !canToggleTask(selectedTask)) return;
    const before = tasks;
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, isCompleted } : task));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { await taskApi.toggle(taskId, isCompleted); }
    catch (error) { setTasks(before); console.error(error); }
  };

  const assignUserToTask = async (userId: string | null) => {
    if (!canManageTasks) return;
    if (!assigningTaskId) return;
    const taskId = assigningTaskId;
    const before = tasks;
    const assignee = members.find((member) => member.id === userId) || null;
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, assigneeId: userId, assignee } : task));
    setAssigningTaskId(null);
    try { await taskApi.assign(taskId, userId); }
    catch (error) { setTasks(before); console.error(error); }
  };

  const deleteTask = async (taskId: string) => {
    if (!canManageTasks) return;
    const before = tasks;
    setTasks((current) => current.filter((task) => task.id !== taskId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try { await taskApi.delete(taskId); }
    catch (error) { setTasks(before); console.error(error); }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: contentInsetTop + 14 }]}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) =>
          onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)
        }
        scrollEventThrottle={16}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <View style={styles.progressRow}>
            <View
              style={[
                styles.progressIcon,
                { backgroundColor: palette.successLight },
              ]}
            ><Ionicons name="checkmark-done-outline" size={22} color={COLORS.success} /></View>
            <View style={styles.progressBody}>
              <Text style={[styles.progressTitle, { color: palette.textPrimary }]}>Tiến độ công việc</Text>
              <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Mọi thành viên cùng cập nhật</Text>
            </View>
            <Text style={styles.progressValue}>{completedCount}/{tasks.length}</Text>
          </View>
          {readOnly || !trip.isLeader ? (
            <View style={[styles.readOnlyBanner, { backgroundColor: palette.surfaceMuted }]}>
              <Ionicons name="lock-closed-outline" size={16} color={palette.textSecondary} />
              <Text style={[styles.readOnlyText, { color: palette.textSecondary }]}>{readOnly ? 'Chuyến đi đã kết thúc · Chỉ xem' : 'Bạn chỉ có thể hoàn thành việc được giao cho mình'}</Text>
            </View>
          ) : null}
          {canManageTasks ? <View style={styles.quickAdd}>
            <TextInput value={title} onChangeText={setTitle} onSubmitEditing={createTask}
              placeholder="Thêm việc cần làm..." placeholderTextColor={palette.textLight}
              maxLength={180} returnKeyType="done" style={[styles.input, { backgroundColor: palette.surfaceMuted, borderColor: palette.border, color: palette.textPrimary }]} />
            <TouchableOpacity onPress={createTask} disabled={!title.trim() || creating}
              style={[styles.addButton, (!title.trim() || creating) && styles.disabled]}>
              {creating ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={23} color="#fff" />}
            </TouchableOpacity>
          </View> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filterBar}>
          {filters.map((item) => <TouchableOpacity key={item.value} onPress={() => setFilter(item.value)}
            style={[styles.filter, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }, filter === item.value && styles.filterActive]}>
            <Text style={[styles.filterText, { color: palette.textSecondary }, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
          </TouchableOpacity>)}
        </ScrollView>

        <View style={styles.listCard}>
          {loading ? <ActivityIndicator style={styles.empty} color={COLORS.primary} /> : visibleTasks.length === 0 ? (
            <View style={styles.empty}><Ionicons name="checkmark-done-circle-outline" size={38} color={palette.textLight} /><Text style={[styles.emptyText, { color: palette.textSecondary }]}>Chưa có công việc trong bộ lọc này</Text></View>
          ) : visibleTasks.map((task) => (
            <View key={task.id} style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <TouchableOpacity onPress={() => toggleTaskStatus(task.id, !task.isCompleted)} disabled={!canToggleTask(task)}
                accessibilityLabel={task.isCompleted ? 'Đánh dấu chưa xong' : 'Đánh dấu đã xong'}
                style={[styles.checkbox, { borderColor: palette.border }, task.isCompleted && styles.checkboxDone, !canToggleTask(task) && styles.readOnlyControl]}>
                {task.isCompleted && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
              <View style={styles.taskContent}>
                <Text numberOfLines={2} style={[styles.taskTitle, { color: palette.textPrimary }, task.isCompleted && [styles.taskDone, { color: palette.textLight }]]}>{task.title}</Text>
                <Text numberOfLines={1} style={[styles.dueDate, { color: palette.textSecondary }]}>{task.assignee ? `Giao cho ${task.assignee.name}` : 'Chưa giao cho ai'}{task.dueDate ? `  •  Hạn ${new Date(task.dueDate).toLocaleDateString('vi-VN')}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setAssigningTaskId(task.id)} disabled={!canManageTasks} style={[styles.assignee, { borderColor: palette.border }, !canManageTasks && styles.readOnlyControl]}>
                {task.assignee?.avatar ? <Image source={{ uri: task.assignee.avatar }} style={styles.avatar} /> : task.assignee ? (
                  <View style={styles.avatarFallback}><Text style={styles.avatarText}>{task.assignee.name?.[0]?.toUpperCase()}</Text></View>
                ) : <Ionicons name="person-add-outline" size={18} color={COLORS.primary} />}
              </TouchableOpacity>
              {canManageTasks ? <TouchableOpacity onPress={() => deleteTask(task.id)} hitSlop={8} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={19} color={COLORS.error} />
              </TouchableOpacity> : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={Boolean(assigningTaskId)} transparent animationType="slide" onRequestClose={() => setAssigningTaskId(null)}>
        <Pressable style={styles.overlay} onPress={() => setAssigningTaskId(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: palette.surface }]} onPress={(event) => event.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: palette.border }]} />
            <Text style={[styles.sheetTitle, { color: palette.textPrimary }]}>Giao việc cho</Text>
            <TouchableOpacity style={styles.memberRow} onPress={() => assignUserToTask(null)}>
              <View style={[styles.unassigned, { backgroundColor: palette.surfaceMuted }]}><Ionicons name="person-outline" size={18} color={palette.textSecondary} /></View>
              <Text style={[styles.memberName, { color: palette.textPrimary }]}>Chưa giao cho ai</Text>
            </TouchableOpacity>
            {members.map((member) => <TouchableOpacity key={member.id} style={styles.memberRow} onPress={() => assignUserToTask(member.id)}>
              {member.avatar ? <Image source={{ uri: member.avatar }} style={styles.memberAvatar} /> : <View style={styles.memberAvatarFallback}><Text style={styles.avatarText}>{member.name?.[0]?.toUpperCase()}</Text></View>}
              <Text style={[styles.memberName, { color: palette.textPrimary }]}>{member.name}</Text>
            </TouchableOpacity>)}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 12, paddingTop: 14, paddingBottom: 110 },
  card: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#3D4E62', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  progressIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.successLight, alignItems: 'center', justifyContent: 'center' },
  progressBody: { flex: 1, marginLeft: 11 },
  progressTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  progressValue: { fontSize: 18, fontWeight: '800', color: COLORS.success },
  subtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
  readOnlyBanner: { minHeight: 36, marginBottom: 12, paddingHorizontal: 11, borderRadius: 12, backgroundColor: COLORS.surfaceMuted, flexDirection: 'row', alignItems: 'center', gap: 7 },
  readOnlyText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  quickAdd: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 46, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceMuted, color: COLORS.textPrimary },
  addButton: { width: 46, height: 46, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  readOnlyControl: { opacity: 0.7 },
  filterBar: { marginTop: 12, marginBottom: 8 },
  filters: { gap: 8 },
  filter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary },
  filterText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  filterTextActive: { color: COLORS.primary, fontWeight: '700' },
  listCard: { minHeight: 150 },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, marginBottom: 12, backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#3D4E62', shadowOpacity: 0.045, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  checkbox: { width: 25, height: 25, borderRadius: 13, borderWidth: 2, borderColor: '#BCC7D5', alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 19 },
  taskDone: { color: COLORS.textLight, textDecorationLine: 'line-through' },
  dueDate: { fontSize: 10, color: COLORS.textSecondary, marginTop: 3 },
  assignee: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  deleteButton: { padding: 4 },
  empty: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,.48)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 34, maxHeight: '70%' },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', minHeight: 54, gap: 12 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18 },
  memberAvatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  unassigned: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
});
