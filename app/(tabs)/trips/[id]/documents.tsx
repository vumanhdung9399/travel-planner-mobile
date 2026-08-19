import { AppToast } from '@/src/components/AppToast';
import DraggableBottomSheet from '@/src/components/DraggableBottomSheet';
import TripDetailFormSheet from '@/src/components/trip/TripDetailFormSheet';
import { useAppPalette } from '@/src/hook/useAppPalette';
import { getOfflineDocumentPath } from '@/src/services/offline-pack';
import { tripDocumentApi } from '@/src/services/trip-document';
import { useAuthStore } from '@/src/store/auth.store';
import { useTripStore } from '@/src/store/trip.store';
import type { DocumentCategory, DocumentVisibility, TripDocument } from '@/src/type/trip-document';
import { COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES: { value: DocumentCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'transport', label: 'Di chuyển', icon: 'airplane-outline' },
  { value: 'hotel', label: 'Khách sạn', icon: 'bed-outline' },
  { value: 'ticket', label: 'Vé', icon: 'ticket-outline' },
  { value: 'insurance', label: 'Bảo hiểm', icon: 'shield-checkmark-outline' },
  { value: 'identity', label: 'Giấy tờ', icon: 'id-card-outline' },
  { value: 'other', label: 'Khác', icon: 'document-outline' },
];
const categoryMeta = (value: DocumentCategory) => CATEGORIES.find((item) => item.value === value) || CATEGORIES[5];
type DocumentDetails = TripDocument & { extractedData?: Record<string, unknown> };

const textValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return JSON.stringify(value, null, 2);
};
const dateValue = (value: unknown) => {
  const text = textValue(value);
  if (!text) return null;
  const parsed = dayjs(text);
  return parsed.isValid() ? parsed.format('HH:mm DD/MM/YYYY') : text;
};

export default function DocumentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useAppPalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const trip = useTripStore((state) => state.trip);
  const userId = useAuthStore((state) => state.user?.id);
  const isTripClosed = trip.id === id && trip.isCloseTrip;

  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<DocumentDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [visibility, setVisibility] = useState<DocumentVisibility>('group');
  const [importText, setImportText] = useState('');
  const [autoExtract, setAutoExtract] = useState(true);
  const [provider, setProvider] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [reminderAt, setReminderAt] = useState<Date | null>(null);
  const [showReminder, setShowReminder] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setDocuments((await tripDocumentApi.list(id)).data);
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const choose = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      setAsset(result.assets[0]);
      setImportText('');
      setTitle((current) => current || result.assets[0].name.replace(/\.[^.]+$/, ''));
    }
  };

  const upload = async () => {
    if (isTripClosed) {
      AppToast.show({ title: 'Không thể thêm tài liệu', message: 'Chuyến đi đã đóng.', type: 'info' });
      return false;
    }
    if ((!asset && !importText.trim()) || !title.trim()) {
      AppToast.show({ title: 'Thiếu tài liệu', message: 'Chọn file hoặc dán nội dung booking và nhập tên.', type: 'info' });
      return false;
    }
    try {
      setSaving(true);
      let created: TripDocument;
      if (importText.trim()) {
        created = (await tripDocumentApi.importText({
          tripId: id,
          title: title.trim(),
          content: importText.trim(),
          category,
          visibility,
          provider: provider || undefined,
          referenceCode: referenceCode || undefined,
          address: address || undefined,
          phone: phone || undefined,
          reminderAt: reminderAt?.toISOString(),
        })).data;
      } else {
        const data = new FormData();
        data.append('title', title.trim());
        data.append('category', category);
        data.append('visibility', visibility);
        if (provider) data.append('provider', provider);
        if (referenceCode) data.append('referenceCode', referenceCode);
        if (address) data.append('address', address);
        if (phone) data.append('phone', phone);
        if (reminderAt) data.append('reminderAt', reminderAt.toISOString());
        data.append('file', { uri: asset!.uri, name: asset!.name, type: asset!.mimeType || 'application/octet-stream' } as any);
        created = (await tripDocumentApi.upload(id, data)).data;
        if (autoExtract) await tripDocumentApi.extract(created.id);
      }
      setAsset(null);
      setTitle('');
      setImportText('');
      setCategory('other');
      setVisibility('group');
      setProvider('');
      setReferenceCode('');
      setAddress('');
      setPhone('');
      setReminderAt(null);
      await load();
      AppToast.show({ title: 'Đã lưu tài liệu', message: 'Thông tin đặt chỗ đã được cập nhật.' });
      return true;
    } finally {
      setSaving(false);
    }
  };

  const openFile = async (document: TripDocument) => {
    if (document.sourceType === 'text') return;
    try {
      const { url } = (await tripDocumentApi.access(document.id)).data;
      await Linking.openURL(url);
    } catch {
      const localPath = await getOfflineDocumentPath(id, document.id);
      if (!localPath) {
        AppToast.show({ title: 'Không thể mở tài liệu', message: 'Tài liệu này chưa được tải về thiết bị.', type: 'error' });
        return;
      }
      const contentUri = await FileSystem.getContentUriAsync(localPath);
      await Linking.openURL(contentUri);
    }
  };

  const openDetails = async (document: TripDocument) => {
    setDetailLoading(true);
    setDetail({ ...document });
    try {
      setDetail((await tripDocumentApi.details(document.id)).data);
    } catch {
      setDetail(null);
      AppToast.show({ title: 'Không thể xem thông tin AI', message: 'Vui lòng thử lại sau.', type: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  const extract = async (document: TripDocument) => {
    setDocuments((current) => current.map((item) => item.id === document.id ? { ...item, extractionStatus: 'pending' } : item));
    try {
      await tripDocumentApi.extract(document.id);
      await load();
      AppToast.show({ title: 'Đã đọc tài liệu', message: 'Mã đặt chỗ, thời gian và địa chỉ đã được trích xuất.' });
    } catch {
      await load();
    }
  };

  const remove = (document: TripDocument) => Alert.alert('Xóa tài liệu?', document.title, [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Xóa', style: 'destructive', onPress: async () => {
      await tripDocumentApi.remove(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
    } },
  ]);

  const detailRows = detail ? [
    ['Nhà cung cấp', detail.provider || detail.extractedData?.provider],
    ['Mã đặt chỗ', detail.referenceCode || detail.extractedData?.referenceCode],
    ['Địa chỉ', detail.address || detail.extractedData?.address],
    ['Điện thoại', detail.phone || detail.extractedData?.phone],
    ['Bắt đầu / check-in', dateValue(detail.checkInAt || detail.startsAt || detail.extractedData?.checkInAt || detail.extractedData?.startsAt)],
    ['Kết thúc', dateValue(detail.endsAt || detail.extractedData?.endsAt)],
    ['Hạn hủy miễn phí', dateValue(detail.cancelBefore || detail.extractedData?.cancelBefore)],
    ['Hết hạn', dateValue(detail.expiresAt || detail.extractedData?.expiresAt)],
  ].map(([label, value]) => ({ label: String(label), value: textValue(value) })).filter((item) => item.value) : [];

  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
    <StatusBar style={palette.isDark ? 'light' : 'dark'} backgroundColor={palette.surface} />
    <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={palette.textPrimary} /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={styles.title}>Ví tài liệu</Text><Text style={styles.subtitle}>{trip.id === id ? trip.name : 'Tài liệu chuyến đi'}</Text></View>
      {!isTripClosed ? <TouchableOpacity onPress={() => setOpen(true)} style={styles.addButton}><Ionicons name="add" size={24} color="#fff" /></TouchableOpacity> : null}
    </View>

    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}>
      <View style={styles.security}><Ionicons name="lock-closed" size={18} color={COLORS.primary} /><Text style={styles.securityText}>{isTripClosed ? 'Chuyến đi đã đóng nên không thể thêm tài liệu mới.' : 'Chạm vào tài liệu để xem dữ liệu AI đã trích xuất. Nút mở ngoài dùng để xem file gốc.'}</Text></View>
      {!loading && documents.length === 0 ? <View style={styles.empty}><Ionicons name="folder-open-outline" size={50} color={palette.textLight} /><Text style={styles.emptyTitle}>Ví tài liệu đang trống</Text><Text style={styles.emptyText}>Lưu vé, booking, bảo hiểm và giấy tờ cần thiết tại đây.</Text></View> : null}
      {documents.map((document) => {
        const meta = categoryMeta(document.category);
        return <TouchableOpacity key={document.id} onPress={() => void openDetails(document)} style={styles.card}>
          <View style={styles.fileIcon}><Ionicons name={meta.icon} size={24} color={COLORS.primary} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.nameRow}><Text numberOfLines={1} style={styles.fileName}>{document.title}</Text>{document.visibility === 'private' ? <Ionicons name="lock-closed" size={13} color={palette.textSecondary} /> : null}</View>
            <Text style={styles.fileMeta}>{meta.label}{document.provider ? ` · ${document.provider}` : ''}{document.referenceCode ? ` · Mã ${document.referenceCode}` : ''}</Text>
            <Text numberOfLines={1} style={styles.owner}>{document.startsAt ? dayjs(document.startsAt).format('HH:mm DD/MM/YYYY') : dayjs(document.createdAt).format('DD/MM/YYYY')}{document.address ? ` · ${document.address}` : ''}</Text>
          </View>
          <View style={styles.actions}>
            {document.sourceType !== 'text' ? <TouchableOpacity onPress={(event) => { event.stopPropagation(); void openFile(document); }} hitSlop={9}><Ionicons name="open-outline" size={20} color={palette.textSecondary} /></TouchableOpacity> : null}
            {document.uploadedById === userId ? <TouchableOpacity disabled={document.extractionStatus === 'pending'} onPress={(event) => { event.stopPropagation(); void extract(document); }} hitSlop={9}><Ionicons name="sparkles-outline" size={20} color={COLORS.primary} /></TouchableOpacity> : null}
            {document.uploadedById === userId ? <TouchableOpacity onPress={(event) => { event.stopPropagation(); remove(document); }} hitSlop={9}><Ionicons name="trash-outline" size={20} color={COLORS.error} /></TouchableOpacity> : null}
          </View>
        </TouchableOpacity>;
      })}
    </ScrollView>

    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <TripDetailFormSheet
        title="Thêm tài liệu"
        onCancel={() => setOpen(false)}
        onSubmit={upload}
        loading={saving}
        submitLabel="Lưu vào ví tài liệu"
        closeOnSubmitSuccess
        height="94%"
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
          <TouchableOpacity onPress={() => void choose()} style={styles.picker}><Ionicons name={asset ? 'document-attach' : 'cloud-upload-outline'} size={30} color={COLORS.primary} /><Text numberOfLines={1} style={styles.pickerTitle}>{asset?.name || 'Chọn PDF hoặc hình ảnh'}</Text><Text style={styles.fileMeta}>Tối đa 12 MB</Text></TouchableOpacity>
          <TextInput value={importText} onChangeText={(value) => { setImportText(value); if (value) setAsset(null); }} placeholder="Hoặc dán nội dung email/booking" placeholderTextColor={palette.textLight} style={[styles.input, styles.multiline]} multiline />
          <TextInput value={title} onChangeText={setTitle} placeholder="Tên tài liệu" placeholderTextColor={palette.textLight} style={styles.input} maxLength={180} />
          <Text style={styles.label}>Phân loại</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{CATEGORIES.map((item) => <TouchableOpacity key={item.value} onPress={() => setCategory(item.value)} style={[styles.chip, category === item.value && styles.chipActive]}><Ionicons name={item.icon} size={16} color={category === item.value ? COLORS.primary : palette.textSecondary} /><Text style={[styles.chipText, category === item.value && { color: COLORS.primary }]}>{item.label}</Text></TouchableOpacity>)}</ScrollView>
          <TextInput value={provider} onChangeText={setProvider} placeholder="Nhà cung cấp" placeholderTextColor={palette.textLight} style={styles.input} />
          <TextInput value={referenceCode} onChangeText={setReferenceCode} placeholder="Mã đặt chỗ" placeholderTextColor={palette.textLight} style={styles.input} />
          <TextInput value={address} onChangeText={setAddress} placeholder="Địa chỉ" placeholderTextColor={palette.textLight} style={styles.input} />
          <TextInput value={phone} onChangeText={setPhone} placeholder="Số điện thoại" placeholderTextColor={palette.textLight} style={styles.input} />
          <TouchableOpacity onPress={() => setShowReminder(true)} style={styles.reminder}><Ionicons name="notifications-outline" size={18} color={COLORS.primary} /><Text style={styles.switchTitle}>{reminderAt ? `Nhắc ${dayjs(reminderAt).format('HH:mm DD/MM')}` : 'Đặt thời gian nhắc'}</Text></TouchableOpacity>
          {showReminder ? <DateTimePicker value={reminderAt || new Date(Date.now() + 86400000)} mode="datetime" minimumDate={new Date()} onChange={(_, value) => { setShowReminder(false); if (value) setReminderAt(value); }} /> : null}
          <View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={styles.switchTitle}>Tài liệu riêng tư</Text><Text style={styles.fileMeta}>Chỉ bạn có thể xem tài liệu này</Text></View><Switch value={visibility === 'private'} onValueChange={(value) => setVisibility(value ? 'private' : 'group')} trackColor={{ true: COLORS.primary }} /></View>
          <View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={styles.switchTitle}>AI tự đọc tài liệu</Text><Text style={styles.fileMeta}>Trích xuất mã, thời gian và địa chỉ</Text></View><Switch value={autoExtract} onValueChange={setAutoExtract} trackColor={{ true: COLORS.primary }} /></View>
        </ScrollView>
      </TripDetailFormSheet>
    </Modal>

    <DraggableBottomSheet
      visible={!!detail}
      onClose={() => setDetail(null)}
      sheetStyle={styles.detailSheet}
      handleColor={palette.border}
      accessibilityLabel="Kéo xuống để đóng chi tiết tài liệu"
    >
        <ScrollView contentContainerStyle={styles.sheetContent}>
          <View style={styles.detailHeader}><View style={styles.aiIcon}><Ionicons name="sparkles" size={21} color={COLORS.primary} /></View><View style={{ flex: 1 }}><Text style={styles.sheetTitle}>{detail?.title}</Text><Text style={styles.fileMeta}>Thông tin được AI trích xuất từ tài liệu</Text></View></View>
          {detailLoading ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 36 }} /> : detailRows.length ? <View style={styles.detailList}>{detailRows.map((row) => <View key={row.label} style={styles.detailRow}><Text style={styles.detailLabel}>{row.label}</Text><Text selectable style={styles.detailValue}>{row.value}</Text></View>)}</View> : <View style={styles.noDetail}><Ionicons name="sparkles-outline" size={30} color={palette.textLight} /><Text style={styles.emptyText}>AI chưa tìm thấy thông tin có cấu trúc trong tài liệu này.</Text></View>}
          {!detailLoading && textValue(detail?.extractedData?.notes) ? <View style={styles.notes}><Text style={styles.detailLabel}>Ghi chú AI</Text><Text selectable style={styles.detailValue}>{textValue(detail?.extractedData?.notes)}</Text></View> : null}
          {!detailLoading && textValue(detail?.extractedData?.rawText) ? <View style={styles.notes}><Text style={styles.detailLabel}>Nội dung đã đọc</Text><Text selectable style={styles.rawText}>{textValue(detail?.extractedData?.rawText)}</Text></View> : null}
          {!detailLoading && detail?.sourceType !== 'text' ? <TouchableOpacity onPress={() => detail && void openFile(detail)} style={styles.secondaryButton}><Ionicons name="open-outline" size={18} color={COLORS.primary} /><Text style={styles.secondaryButtonText}>Mở file gốc</Text></TouchableOpacity> : null}
        </ScrollView>
    </DraggableBottomSheet>
  </SafeAreaView>;
}

const createStyles = (p: ReturnType<typeof useAppPalette>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: p.background },
  header: { paddingHorizontal: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: p.surface, borderBottomWidth: 1, borderBottomColor: p.border },
  headerButton: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: p.textPrimary },
  subtitle: { fontSize: 11, color: p.textSecondary },
  addButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 14, gap: 10, paddingBottom: 80 },
  security: { padding: 12, flexDirection: 'row', gap: 9, borderRadius: 13, backgroundColor: p.primaryLight },
  securityText: { flex: 1, color: p.textSecondary, fontSize: 11, lineHeight: 16 },
  empty: { alignItems: 'center', paddingTop: 70 },
  emptyTitle: { marginTop: 12, color: p.textPrimary, fontWeight: '800', fontSize: 17 },
  emptyText: { marginTop: 5, color: p.textSecondary, textAlign: 'center' },
  card: { minHeight: 78, padding: 13, borderRadius: 17, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, flexDirection: 'row', alignItems: 'center', gap: 11 },
  fileIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primaryLight },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fileName: { flexShrink: 1, color: p.textPrimary, fontWeight: '800' },
  fileMeta: { marginTop: 3, color: p.textSecondary, fontSize: 10 },
  owner: { marginTop: 3, color: p.textLight, fontSize: 9 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0 },
  sheet: { maxHeight: '94%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: p.surface },
  detailSheet: { maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: p.surface },
  sheetContent: { paddingHorizontal: 18, paddingBottom: 34 },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: p.textPrimary, marginBottom: 3 },
  picker: { minHeight: 100, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary, backgroundColor: p.primaryLight, marginBottom: 10 },
  pickerTitle: { maxWidth: '90%', marginTop: 6, color: p.textPrimary, fontWeight: '700' },
  input: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: p.border, backgroundColor: p.surfaceMuted, color: p.textPrimary, paddingHorizontal: 13, marginBottom: 9 },
  multiline: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' },
  label: { marginTop: 13, marginBottom: 7, color: p.textPrimary, fontWeight: '700' },
  chips: { gap: 7, paddingRight: 8, marginBottom: 14 },
  chip: { height: 37, paddingHorizontal: 10, flexDirection: 'row', gap: 5, alignItems: 'center', borderRadius: 19, borderWidth: 1, borderColor: p.border },
  chipActive: { borderColor: COLORS.primary, backgroundColor: p.primaryLight },
  chipText: { color: p.textSecondary, fontSize: 11, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  switchTitle: { color: p.textPrimary, fontWeight: '700' },
  reminder: { minHeight: 48, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: p.border, borderRadius: 13 },
  submit: { height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: COLORS.primary, marginBottom: 8 },
  submitText: { color: '#fff', fontWeight: '800' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 16 },
  aiIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primaryLight },
  detailList: { borderWidth: 1, borderColor: p.border, borderRadius: 16, overflow: 'hidden' },
  detailRow: { padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.border },
  detailLabel: { color: p.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  detailValue: { color: p.textPrimary, fontSize: 13, fontWeight: '600', lineHeight: 19, marginTop: 4 },
  rawText: { color: p.textPrimary, fontSize: 11, lineHeight: 17, marginTop: 5 },
  notes: { padding: 13, marginTop: 10, borderRadius: 16, backgroundColor: p.surfaceMuted },
  noDetail: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 20 },
  secondaryButton: { height: 48, marginTop: 14, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { color: COLORS.primary, fontWeight: '800' },
});
