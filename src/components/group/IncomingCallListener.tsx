import { useAuthStore } from "@/src/store/auth.store";
import { initSocket } from "@/src/utils/socket";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  NativeModules,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Avatar, Text } from "react-native-paper";
import type { CallMedia } from "./GroupCall";

type IncomingCall = {
  groupId: string;
  callId?: string;
  userId: string;
  name?: string;
  media: CallMedia;
};

type TravelCallAudioModule = {
  dismissIncomingCallNotification?: (groupId: string) => Promise<void>;
  startIncomingRingtone?: () => Promise<boolean>;
  stopIncomingRingtone?: () => Promise<void>;
};

const callAudio = NativeModules.TravelCallAudio as
  | TravelCallAudioModule
  | undefined;

export default function IncomingCallListener() {
  const router = useRouter();
  const pathname = usePathname();
  const routeParams = useGlobalSearchParams<{ id?: string; call?: string }>();
  const token = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const socket = useMemo(
    () =>
      token && currentUser?.id
        ? initSocket(String(currentUser.id), token)
        : null,
    [currentUser?.id, token],
  );
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const incomingRef = useRef<IncomingCall | null>(null);

  const clearIncoming = useCallback((groupId?: string) => {
    if (groupId && incomingRef.current?.groupId !== groupId) return;
    const dismissedGroupId = incomingRef.current?.groupId;
    incomingRef.current = null;
    setIncoming(null);
    void callAudio?.stopIncomingRingtone?.().catch(() => undefined);
    if (dismissedGroupId) {
      void callAudio?.dismissIncomingCallNotification?.(dismissedGroupId).catch(
        () => undefined,
      );
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onStarted = (data: IncomingCall) => {
      if (String(data.userId) === String(currentUser?.id)) return;
      incomingRef.current = data;
      setIncoming(data);
      void callAudio?.startIncomingRingtone?.().catch(() => undefined);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };
    const onEnded = (data: { groupId: string; callId?: string }) => {
      if (
        data.callId &&
        incomingRef.current?.callId &&
        data.callId !== incomingRef.current.callId
      ) {
        return;
      }
      clearIncoming(data.groupId);
    };
    socket.on("call:started", onStarted);
    socket.on("call:ended", onEnded);
    return () => {
      socket.off("call:started", onStarted);
      socket.off("call:ended", onEnded);
    };
  }, [clearIncoming, currentUser?.id, socket]);

  useEffect(
    () => () => {
      void callAudio?.stopIncomingRingtone?.().catch(() => undefined);
    },
    [],
  );

  useEffect(() => {
    if (
      incoming &&
      routeParams.id === incoming.groupId &&
      (routeParams.call === "audio" || routeParams.call === "video") &&
      pathname.endsWith("/chat")
    ) {
      clearIncoming(incoming.groupId);
    }
  }, [clearIncoming, incoming, pathname, routeParams.call, routeParams.id]);

  const accept = () => {
    if (!incoming) return;
    const call = incoming;
    clearIncoming(call.groupId);
    router.push({
      pathname: "/groups/[id]/chat",
      params: { id: call.groupId, call: call.media },
    });
  };

  return (
    <Modal
      visible={!!incoming}
      transparent
      animationType="fade"
      onRequestClose={() => clearIncoming()}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Avatar.Text
            size={82}
            label={(incoming?.name || "N").slice(0, 1).toUpperCase()}
            style={styles.avatar}
          />
          <Text style={styles.name}>
            {incoming?.name || "Thành viên nhóm"}
          </Text>
          <Text style={styles.subtitle}>
            Cuộc gọi nhóm {incoming?.media === "video" ? "video" : "thoại"} đến
          </Text>
          <View style={styles.actions}>
            <View style={styles.actionWrap}>
              <TouchableOpacity
                accessibilityLabel="Từ chối cuộc gọi"
                onPress={() => clearIncoming()}
                style={[styles.button, styles.decline]}
              >
                <Ionicons
                  name="call"
                  size={29}
                  color="#fff"
                  style={{ transform: [{ rotate: "135deg" }] }}
                />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Từ chối</Text>
            </View>
            <View style={styles.actionWrap}>
              <TouchableOpacity
                accessibilityLabel="Nhận cuộc gọi"
                onPress={accept}
                style={[styles.button, styles.accept]}
              >
                <Ionicons
                  name={incoming?.media === "video" ? "videocam" : "call"}
                  size={29}
                  color="#fff"
                />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Nhận</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(7,12,22,.82)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 28,
    backgroundColor: "#20242A",
  },
  avatar: { backgroundColor: "#1687F8" },
  name: { marginTop: 18, color: "#fff", fontSize: 22, fontWeight: "800" },
  subtitle: {
    marginTop: 7,
    color: "rgba(255,255,255,.68)",
    fontSize: 14,
  },
  actions: {
    width: "100%",
    marginTop: 34,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionWrap: { alignItems: "center", gap: 8 },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  decline: { backgroundColor: "#DC2626" },
  accept: { backgroundColor: "#16A34A" },
  actionLabel: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
