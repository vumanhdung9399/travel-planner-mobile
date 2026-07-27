import { AppToast } from "@/src/components/AppToast";
import { api } from "@/src/services/api";
import type { TimelineItemType, Trip } from "@/src/type/trip";
import { COLORS } from "@/src/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";

type AIAction = "add" | "edit" | "replace" | "optimize";
type AIResponse = {
  message: string;
  timeline: TimelineItemType[];
  action: AIAction;
};
type Message = { id: string; role: "user" | "assistant"; content: string };

const OPTIONS = [
  ["✨ Tạo lịch trình mới", "Tạo lịch trình chi tiết cho toàn bộ chuyến đi, gợi ý các địa điểm và nhà hàng nổi tiếng"],
  ["🍽️ Gợi ý ẩm thực", "Gợi ý các nhà hàng và quán ăn đặc sản nổi tiếng tại điểm đến cho từng bữa trong lịch trình"],
  ["🎯 Thêm điểm vui chơi", "Thêm các địa điểm vui chơi giải trí và hoạt động về đêm vào lịch trình"],
  ["⏱️ Tối ưu lộ trình", "Tối ưu lại thứ tự các địa điểm để tiết kiệm thời gian di chuyển nhất"],
  ["💰 Tiết kiệm chi phí", "Tối ưu lịch trình để tiết kiệm chi phí, ưu tiên địa điểm miễn phí hoặc giá tốt"],
] as const;

const ACTION_LABEL: Record<AIAction, string> = {
  add: "Thêm mới",
  edit: "Chỉnh sửa",
  replace: "Thay thế",
  optimize: "Tối ưu",
};

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "Chào bạn! Tôi là trợ lý AI của Travel Planner. Hãy mô tả lịch trình bạn mong muốn hoặc chọn một gợi ý nhanh.",
};

interface Props {
  open: boolean;
  trip: Trip;
  existingTimeline: TimelineItemType[];
  onClose: () => void;
  onUpdated: () => void;
}

export default function AIChatModal({ open, trip, existingTimeline, onClose, onUpdated }: Props) {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [result, setResult] = useState<AIResponse | null>(null);

  const close = () => {
    if (loading) return;
    setInput("");
    setMessages([WELCOME]);
    setResult(null);
    onClose();
  };

  const send = async () => {
    const content = input.trim();
    if (!content || loading) return;
    setMessages((value) => [...value, { id: `${Date.now()}-u`, role: "user", content }]);
    setInput("");
    setResult(null);
    setLoading(true);
    try {
      const response = await api.post<AIResponse>(
        "/ai/optimize-trip",
        {
          tripId: trip.id,
          message: content,
          currentTimeline: existingTimeline,
          tripInfo: {
            startDate: trip.startDate,
            endDate: trip.endDate,
            destination: trip.location,
            name: trip.name,
          },
        },
        { timeout: 600_000 },
      );
      const data = response.data;
      setResult(data.timeline?.length ? data : null);
      setMessages((value) => [
        ...value,
        {
          id: `${Date.now()}-a`,
          role: "assistant",
          content: `${data.message || "Đã xử lý yêu cầu của bạn."}\n\nHành động: ${ACTION_LABEL[data.action]}.`,
        },
      ]);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Không thể gọi trợ lý AI. Vui lòng thử lại.";
      AppToast.show({ title: "Có lỗi xảy ra", message, type: "error" });
      setMessages((value) => [...value, { id: `${Date.now()}-e`, role: "assistant", content: message }]);
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    if (!result) return;
    AppToast.show({
      title: "Lịch trình đã được cập nhật",
      message: `${ACTION_LABEL[result.action]} ${result.timeline.length} hoạt động thành công.`,
    });
    onUpdated();
    close();
  };

  const clearTimeline = () => {
    Alert.alert("Xóa toàn bộ lịch trình", "Bạn có chắc chắn muốn xóa toàn bộ lịch trình hiện tại?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await api.delete(`/timelines/trip/${trip.id}`);
            AppToast.show({ title: "Đã xóa", message: "Toàn bộ lịch trình đã được xóa." });
            onUpdated();
            close();
          } catch (error: any) {
            AppToast.show({ title: "Không thể xóa", message: error?.response?.data?.message || "Vui lòng thử lại.", type: "error" });
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
      onRequestClose={close}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <View style={styles.logo}><Ionicons name="sparkles" size={18} color="#fff" /></View>
            <View>
              <Text style={styles.title}>Trợ lý AI</Text>
              {!!trip.location && <Text style={styles.location}>📍 {trip.location}</Text>}
            </View>
          </View>
          <TouchableOpacity onPress={close} disabled={loading}><Ionicons name="close" size={26} color={COLORS.textPrimary} /></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions} contentContainerStyle={styles.suggestionContent}>
          {OPTIONS.map(([label, value]) => (
            <TouchableOpacity key={label} style={styles.suggestion} onPress={() => setInput(value)} disabled={loading}>
              <Text style={styles.suggestionText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
          {messages.map((message) => (
            <View key={message.id} style={[styles.bubble, message.role === "user" ? styles.userBubble : styles.aiBubble]}>
              <Text style={[styles.message, message.role === "user" && styles.userMessage]}>{message.content}</Text>
            </View>
          ))}
          {loading && <View style={[styles.bubble, styles.aiBubble, styles.loading]}><ActivityIndicator color="#7C3AED" /><Text>AI đang tạo lịch trình...</Text></View>}
          {result && (
            <View style={styles.preview}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>✨ Lịch trình gợi ý</Text>
                <Text style={styles.count}>{result.timeline.length} hoạt động</Text>
              </View>
              {result.timeline.map((item, index) => (
                <View key={`${item.day}-${item.time}-${index}`} style={styles.previewItem}>
                  <Text style={styles.previewTime}>Ngày {item.day} · {dayjs(item.time).isValid() ? dayjs(item.time).format("HH:mm") : String(item.time).slice(0, 5)}</Text>
                  <Text style={styles.previewItemTitle}>{item.title}</Text>
                  {!!item.description && <Text style={styles.previewDescription}>{item.description}</Text>}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Nhập yêu cầu cho trợ lý AI..."
            multiline
            editable={!loading}
            style={styles.input}
          />
          <TouchableOpacity disabled={!input.trim() || loading} onPress={send} style={[styles.send, (!input.trim() || loading) && styles.disabled]}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          {existingTimeline.length > 0 && <TouchableOpacity onPress={clearTimeline} disabled={loading}><Text style={styles.clear}>Xóa lịch trình</Text></TouchableOpacity>}
          <View style={styles.footerSpacer} />
          <TouchableOpacity onPress={close} disabled={loading}><Text style={styles.closeText}>Đóng</Text></TouchableOpacity>
          {!!result && (
            <TouchableOpacity onPress={confirm} style={styles.confirm}>
              <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.confirmGradient}><Text style={styles.confirmText}>Xác nhận</Text></LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingTop: 12, paddingHorizontal: 18, paddingBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  location: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  suggestions: { flexGrow: 0, backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  suggestionContent: { padding: 10, gap: 8 },
  suggestion: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#CBD5E1" },
  suggestionText: { fontSize: 12, color: "#475569" },
  chat: { flex: 1, minHeight: 0 },
  chatContent: { padding: 16, gap: 12, flexGrow: 1 },
  bubble: { maxWidth: "88%", padding: 13, borderRadius: 16 },
  aiBubble: { alignSelf: "flex-start", backgroundColor: "#F1F5F9", borderBottomLeftRadius: 4 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#7C3AED", borderBottomRightRadius: 4 },
  message: { fontSize: 14, lineHeight: 20, color: COLORS.textPrimary },
  userMessage: { color: "#fff" },
  loading: { flexDirection: "row", gap: 10, alignItems: "center" },
  preview: { backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 16, padding: 14 },
  previewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  previewTitle: { color: "#166534", fontWeight: "700" },
  count: { fontSize: 11, color: "#166534", backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  previewItem: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#DCFCE7" },
  previewTime: { fontSize: 11, color: "#15803D", fontWeight: "600" },
  previewItemTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, marginTop: 3 },
  previewDescription: { fontSize: 12, lineHeight: 17, color: COLORS.textSecondary, marginTop: 3 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  input: { flex: 1, minHeight: 44, maxHeight: 100, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.textPrimary },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.4 },
  footer: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16 },
  footerSpacer: { flex: 1 },
  clear: { color: "#DC2626", fontWeight: "600" },
  closeText: { color: COLORS.textSecondary, fontWeight: "600" },
  confirm: { borderRadius: 10, overflow: "hidden" },
  confirmGradient: { paddingHorizontal: 18, paddingVertical: 10 },
  confirmText: { color: "#fff", fontWeight: "700" },
});
