import { AppToast } from '@/src/components/AppToast';
import TripDetailFormSheet from '@/src/components/trip/TripDetailFormSheet';
import { useAppPalette } from '@/src/hook/useAppPalette';
import { pollApi } from '@/src/services/poll';
import { useGroupStore } from '@/src/store/group.store';
import type { GroupPoll, PollType, VotingMethod } from '@/src/type/poll';
import { COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PollsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useAppPalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const group = useGroupStore((state) => state.group);
  const canManage = !!group?.isCreate;
  const [polls, setPolls] = useState<GroupPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<PollType>('custom');
  const [method, setMethod] = useState<VotingMethod>('single');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>();
  const [showDeadline, setShowDeadline] = useState(false);
  const [addingTo, setAddingTo] = useState<GroupPoll | null>(null);
  const [newOption, setNewOption] = useState('');
  const [options, setOptions] = useState(['', '']);

  const load = useCallback(async () => {
    try { setLoading(true); setPolls((await pollApi.list(id)).data); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    const cleanOptions = options.map((value) => value.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) {
      AppToast.show({ title: 'Thiếu thông tin', message: 'Nhập câu hỏi và ít nhất 2 phương án.', type: 'info' });
      return false;
    }
    try {
      setSaving(true);
      await pollApi.create(id, { question: question.trim(), description: description.trim() || undefined, type: pollType, votingMethod: method, tripId: selectedTripId, deadline: deadline?.toISOString(), options: cleanOptions });
      setQuestion(''); setDescription(''); setOptions(['', '']); setMethod('single'); setPollType('custom'); setSelectedTripId(undefined); setDeadline(null);
      await load();
      AppToast.show({ title: 'Đã tạo biểu quyết', message: 'Thành viên trong nhóm có thể bắt đầu bình chọn.' });
      return true;
    } finally { setSaving(false); }
  };

  const toggleVote = async (poll: GroupPoll, optionId: string) => {
    if (poll.status === 'closed') return;
    const selected = poll.options.filter((option) => option.selectedByMe).sort((a, b) => (a.rankByMe || 99) - (b.rankByMe || 99)).map((option) => option.id);
    const optionSelected = selected.includes(optionId);
    const next = poll.votingMethod !== 'single'
      ? optionSelected ? selected.filter((id) => id !== optionId) : [...selected, optionId]
      : optionSelected ? [] : [optionId];
    setPolls((current) => current.map((item) => item.id === poll.id ? {
      ...item, options: item.options.map((option) => ({ ...option, selectedByMe: next.includes(option.id) })),
    } : item));
    try {
      const updated = (await (poll.votingMethod === 'ranked' ? pollApi.rank(poll.id, next) : pollApi.vote(poll.id, next))).data;
      setPolls((current) => current.map((item) => item.id === poll.id ? updated : item));
    } catch { await load(); }
  };

  const closePoll = (poll: GroupPoll) => Alert.alert('Chốt kết quả?', 'Phương án có điểm cao nhất sẽ thắng.', [
    { text: 'Hủy', style: 'cancel' },
    ...(poll.tripId ? [{ text: 'Chốt + lịch trình', onPress: async () => { await pollApi.close(poll.id, { addToTimeline: true, day: 1, time: '09:00', notify: true }); await load(); AppToast.show({ title: 'Đã thêm vào lịch trình', message: 'Hoạt động được đặt mặc định vào Ngày 1 lúc 09:00 và có thể chỉnh sửa.' }); } }] : []),
    { text: 'Chỉ chốt', onPress: async () => { await pollApi.close(poll.id); await load(); } },
  ]);
  const addOption = async () => { if (!addingTo || !newOption.trim()) return false; const updated = (await pollApi.addOption(addingTo.id, newOption.trim())).data; setPolls((current) => current.map((item) => item.id === updated.id ? updated : item)); setNewOption(''); return true; };
  const remind = async (poll: GroupPoll) => { const result = (await pollApi.remind(poll.id)).data; AppToast.show({ title: 'Đã gửi nhắc nhở', message: result.sent ? `${result.sent} thành viên chưa vote đã được nhắc.` : 'Tất cả thành viên đã vote.' }); };
  const deletePoll = (poll: GroupPoll) => Alert.alert('Xóa biểu quyết?', 'Toàn bộ phiếu bầu sẽ bị xóa.', [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Xóa', style: 'destructive', onPress: async () => { await pollApi.remove(poll.id); setPolls((current) => current.filter((item) => item.id !== poll.id)); } },
  ]);

  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
    <StatusBar style={palette.isDark ? 'light' : 'dark'} backgroundColor={palette.surface} />
    <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}><Ionicons name="chevron-back" size={25} color={palette.textPrimary} /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={styles.title}>Biểu quyết nhóm</Text><Text style={styles.subtitle}>{group?.name || 'Cùng nhau ra quyết định'}</Text></View>
      {canManage ? <TouchableOpacity onPress={() => setOpen(true)} style={styles.addButton}><Ionicons name="add" size={24} color="#fff" /></TouchableOpacity> : null}
    </View>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}>
      {!loading && polls.length === 0 ? <View style={styles.empty}><Ionicons name="stats-chart-outline" size={48} color={palette.textLight} /><Text style={styles.emptyTitle}>Chưa có biểu quyết</Text><Text style={styles.emptyText}>Leader có thể tạo câu hỏi để cả nhóm cùng chọn.</Text></View> : null}
      {polls.map((poll) => {
        const maxVotes = Math.max(1, ...poll.options.map((option) => poll.votingMethod === 'ranked' ? option.score : option.voteCount));
        const winner = poll.options.find((option) => option.id === poll.winningOptionId);
        return <View key={poll.id} style={styles.card}>
          <View style={styles.cardHeader}><View style={{ flex: 1 }}><Text style={styles.meta}>{poll.type?.toUpperCase()} · {poll.votingMethod === 'ranked' ? 'XẾP HẠNG' : poll.votingMethod === 'multiple' ? 'CHỌN NHIỀU' : 'CHỌN MỘT'}</Text><Text style={styles.question}>{poll.question}</Text><Text style={styles.meta}>{poll.status === 'closed' ? 'Đã chốt' : poll.deadline ? `Hạn ${dayjs(poll.deadline).format('HH:mm DD/MM')}` : 'Đang mở'} · {poll.totalVoters} người đã vote</Text></View>
            {canManage ? <View style={styles.actions}>{poll.status === 'open' ? <><TouchableOpacity onPress={() => void remind(poll)}><Ionicons name="notifications-outline" size={20} color={COLORS.primary} /></TouchableOpacity><TouchableOpacity onPress={() => closePoll(poll)}><Ionicons name="lock-closed-outline" size={20} color={palette.textSecondary} /></TouchableOpacity></> : null}<TouchableOpacity onPress={() => deletePoll(poll)}><Ionicons name="trash-outline" size={20} color={COLORS.error} /></TouchableOpacity></View> : null}
          </View>
          {winner ? <View style={styles.winner}><Text style={styles.winnerText}>✓ Phương án thắng: {winner.label}</Text></View> : null}
          {poll.description ? <Text style={styles.description}>{poll.description}</Text> : null}
          {poll.options.map((option) => <TouchableOpacity key={option.id} disabled={poll.status === 'closed'} onPress={() => void toggleVote(poll, option.id)} style={[styles.option, option.selectedByMe && styles.optionSelected]}>
            <View style={[styles.progress, { width: `${(((poll.votingMethod === 'ranked' ? option.score : option.voteCount) || 0) / maxVotes) * 100}%` }]} />
            {poll.votingMethod === 'ranked' && option.rankByMe ? <View style={styles.rank}><Text style={styles.rankText}>#{option.rankByMe}</Text></View> : <Ionicons name={option.selectedByMe ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={option.selectedByMe ? COLORS.primary : palette.textLight} />}
            <View style={{ flex: 1 }}><Text style={styles.optionLabel}>{option.label}</Text>{option.proposedBy?.name ? <Text style={styles.meta}>Đề xuất bởi {option.proposedBy.name}</Text> : null}</View><Text style={styles.count}>{poll.votingMethod === 'ranked' ? option.score : option.voteCount}</Text>
          </TouchableOpacity>)}
          {poll.status === 'open' ? <TouchableOpacity onPress={() => setAddingTo(poll)}><Text style={styles.addOption}>+ Đề xuất phương án</Text></TouchableOpacity> : null}
          {poll.pendingVoters?.length ? <Text style={styles.pending}>{poll.pendingVoters.length} thành viên chưa vote: {poll.pendingVoters.slice(0, 3).map((person) => person.name).join(', ')}</Text> : null}
          <Text style={styles.footer}>Tạo bởi {poll.createdBy?.name || 'Leader'} · {dayjs(poll.createdAt).format('DD/MM/YYYY')}</Text>
        </View>;
      })}
    </ScrollView>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <TripDetailFormSheet
        title="Tạo biểu quyết"
        onCancel={() => setOpen(false)}
        onSubmit={create}
        loading={saving}
        submitLabel="Tạo biểu quyết"
        closeOnSubmitSuccess
        height="94%"
      >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
        <TextInput value={question} onChangeText={setQuestion} placeholder="Câu hỏi biểu quyết" placeholderTextColor={palette.textLight} style={styles.input} maxLength={180} />
        <TextInput value={description} onChangeText={setDescription} placeholder="Mô tả (không bắt buộc)" placeholderTextColor={palette.textLight} style={[styles.input, { minHeight: 70 }]} multiline maxLength={1000} />
        <Text style={styles.label}>Loại biểu quyết</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{(['date','hotel','restaurant','place','custom'] as PollType[]).map((value) => <TouchableOpacity key={value} onPress={() => setPollType(value)} style={[styles.chip, pollType === value && styles.chipActive]}><Text style={[styles.chipText, pollType === value && styles.chipTextActive]}>{value === 'date' ? 'Ngày đi' : value === 'hotel' ? 'Khách sạn' : value === 'restaurant' ? 'Nhà hàng' : value === 'place' ? 'Địa điểm' : 'Khác'}</Text></TouchableOpacity>)}</ScrollView>
        <Text style={styles.label}>Cách bình chọn</Text><View style={styles.chips}>{(['single','multiple','ranked'] as VotingMethod[]).map((value) => <TouchableOpacity key={value} onPress={() => setMethod(value)} style={[styles.chip, method === value && styles.chipActive]}><Text style={[styles.chipText, method === value && styles.chipTextActive]}>{value === 'single' ? 'Chọn một' : value === 'multiple' ? 'Chọn nhiều' : 'Xếp hạng'}</Text></TouchableOpacity>)}</View>
        <TouchableOpacity onPress={() => setShowDeadline(true)} style={styles.deadline}><Ionicons name="time-outline" size={18} color={COLORS.primary} /><Text style={styles.optionLabel}>{deadline ? `Hạn ${dayjs(deadline).format('HH:mm DD/MM/YYYY')}` : 'Đặt hạn bình chọn'}</Text></TouchableOpacity>
        {showDeadline ? <DateTimePicker value={deadline || new Date(Date.now() + 86400000)} mode="datetime" minimumDate={new Date()} onChange={(_, value) => { setShowDeadline(false); if (value) setDeadline(value); }} /> : null}
        {group?.trips?.length ? <><Text style={styles.label}>Gắn với chuyến đi</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}><TouchableOpacity onPress={() => setSelectedTripId(undefined)} style={[styles.chip, !selectedTripId && styles.chipActive]}><Text style={[styles.chipText, !selectedTripId && styles.chipTextActive]}>Không gắn</Text></TouchableOpacity>{group.trips.map((trip) => <TouchableOpacity key={trip.id} onPress={() => setSelectedTripId(trip.id)} style={[styles.chip, selectedTripId === trip.id && styles.chipActive]}><Text style={[styles.chipText, selectedTripId === trip.id && styles.chipTextActive]}>{trip.name}</Text></TouchableOpacity>)}</ScrollView></> : null}
        {options.map((value, index) => <View key={index} style={styles.optionInputRow}><TextInput value={value} onChangeText={(text) => setOptions((current) => current.map((item, i) => i === index ? text : item))} placeholder={`Phương án ${index + 1}`} placeholderTextColor={palette.textLight} style={[styles.input, { flex: 1 }]} maxLength={180} />{options.length > 2 ? <TouchableOpacity onPress={() => setOptions((current) => current.filter((_, i) => i !== index))}><Ionicons name="close-circle" size={24} color={palette.textLight} /></TouchableOpacity> : null}</View>)}
        {options.length < 12 ? <TouchableOpacity onPress={() => setOptions((current) => [...current, ''])}><Text style={styles.addOption}>+ Thêm phương án</Text></TouchableOpacity> : null}
      </ScrollView>
      </TripDetailFormSheet>
    </Modal>
    <Modal visible={!!addingTo} transparent animationType="slide" onRequestClose={() => setAddingTo(null)}>
      <TripDetailFormSheet
        title="Đề xuất phương án"
        onCancel={() => setAddingTo(null)}
        onSubmit={addOption}
        submitDisabled={!newOption.trim()}
        submitLabel="Thêm phương án"
        closeOnSubmitSuccess
        height="44%"
      >
      <View style={styles.sheetContent}>
        <TextInput value={newOption} onChangeText={setNewOption} placeholder="Tên phương án" placeholderTextColor={palette.textLight} style={styles.input} />
      </View>
      </TripDetailFormSheet>
    </Modal>
  </SafeAreaView>;
}

const createStyles = (p: ReturnType<typeof useAppPalette>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: p.background }, header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 12, backgroundColor: p.surface, borderBottomWidth: 1, borderBottomColor: p.border }, iconButton: { width: 40, height: 40, justifyContent: 'center' }, title: { fontSize: 18, fontWeight: '800', color: p.textPrimary }, subtitle: { fontSize: 11, color: p.textSecondary }, addButton: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary }, content: { padding: 14, gap: 12, paddingBottom: 80 }, empty: { alignItems: 'center', paddingVertical: 80 }, emptyTitle: { marginTop: 12, fontSize: 17, fontWeight: '700', color: p.textPrimary }, emptyText: { marginTop: 5, color: p.textSecondary, textAlign: 'center' }, card: { padding: 15, borderRadius: 18, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }, cardHeader: { flexDirection: 'row', gap: 10 }, question: { fontSize: 16, fontWeight: '800', color: p.textPrimary }, meta: { marginTop: 3, fontSize: 11, color: p.textSecondary }, description: { marginTop: 9, color: p.textSecondary, lineHeight: 19 }, actions: { flexDirection: 'row', gap: 13 }, option: { minHeight: 50, marginTop: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 13, borderWidth: 1, borderColor: p.border, overflow: 'hidden' }, optionSelected: { borderColor: COLORS.primary }, progress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: p.primaryLight, opacity: .55 }, optionLabel: { color: p.textPrimary, fontWeight: '600' }, count: { color: p.textSecondary, fontWeight: '800' }, footer: { marginTop: 12, fontSize: 10, color: p.textLight }, sheet: { maxHeight: '92%', backgroundColor: p.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, sheetContent: { paddingHorizontal: 18, paddingBottom: 34 }, sheetTitle: { fontSize: 19, fontWeight: '800', color: p.textPrimary, marginBottom: 12 }, input: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: p.border, backgroundColor: p.surfaceMuted, color: p.textPrimary, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 9 }, optionInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, addOption: { color: COLORS.primary, fontWeight: '700', marginVertical: 8 }, label: { color: p.textPrimary, fontWeight: '700', marginTop: 5 }, chips: { flexDirection: 'row', gap: 7, marginBottom: 8 }, chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: p.border }, chipActive: { borderColor: COLORS.primary, backgroundColor: p.primaryLight }, chipText: { fontSize: 11, color: p.textSecondary }, chipTextActive: { color: COLORS.primary, fontWeight: '700' }, deadline: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: p.border, borderRadius: 13, marginBottom: 9 }, rank: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }, rankText: { color: '#fff', fontSize: 11, fontWeight: '800' }, winner: { marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: p.successLight }, winnerText: { color: COLORS.success, fontWeight: '800', fontSize: 12 }, pending: { marginTop: 8, color: p.textSecondary, fontSize: 10 }, submit: { height: 50, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 5 }, submitText: { color: '#fff', fontWeight: '800' },
});
