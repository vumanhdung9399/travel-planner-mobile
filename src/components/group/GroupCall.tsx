import { useAuthStore } from "@/src/store/auth.store";
import { initSocket } from "@/src/utils/socket";
import { COLORS } from "@/src/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  type LayoutChangeEvent,
  Modal,
  NativeModules,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Avatar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  MediaStream,
  RTCPeerConnection,
} from "react-native-webrtc";

export type CallMedia = "audio" | "video";

type Participant = {
  socketId: string;
  userId: string;
  name?: string;
  media?: CallMedia;
};

type RemoteStream = Participant & { stream: MediaStream };
type Signal = {
  type: "offer" | "answer" | "candidate";
  sdp?: { type: string | null; sdp: string };
  candidate?: { candidate: string; sdpMLineIndex?: number | null; sdpMid?: string | null };
};

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
const CALL_JOIN_TIMEOUT_MS = 12_000;
const CALL_STAGE_PADDING = 12;
const CALL_TILE_GAP = 10;

function getCallGridColumnCount(
  participantCount: number,
  stageWidth: number,
  stageHeight: number,
) {
  const isPortrait = stageHeight >= stageWidth;
  if (isPortrait) return participantCount <= 2 ? 1 : 2;
  if (participantCount === 1) return 1;
  return participantCount <= 4 ? 2 : 3;
}

type WebRTCLibrary = typeof import("react-native-webrtc");
let webRTCLibrary: WebRTCLibrary | null | undefined;

function getWebRTCLibrary() {
  if (!NativeModules.WebRTCModule) return null;
  if (webRTCLibrary === undefined) {
    // Loading lazily keeps Expo Go and development builds created before the
    // native dependency was added from crashing while the JS bundle starts.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    webRTCLibrary = require("react-native-webrtc") as WebRTCLibrary;
  }
  return webRTCLibrary;
}

function getMediaErrorMessage(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Bạn cần cấp quyền micro/camera để thực hiện cuộc gọi.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Không tìm thấy micro hoặc camera phù hợp trên thiết bị.";
  }
  return "Không thể mở micro/camera. Vui lòng kiểm tra quyền ứng dụng và thử lại.";
}

function createCallError(name: "CallConnectionError" | "CallRoomError", message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}

function getCallErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    (error.name === "CallConnectionError" || error.name === "CallRoomError")
  ) {
    return error.message;
  }
  return getMediaErrorMessage(error);
}

function CallTile({
  item,
  width,
  height,
  avatarSize,
  mirror = false,
}: {
  item: RemoteStream;
  width: number;
  height: number;
  avatarSize: number;
  mirror?: boolean;
}) {
  const hasVideo = item.stream.getVideoTracks().some((track) => track.enabled);
  const RTCView = getWebRTCLibrary()?.RTCView;

  return (
    <View style={[styles.tile, { width, height }]}>
      {hasVideo && RTCView ? (
        <RTCView
          mirror={mirror}
          objectFit="cover"
          streamURL={item.stream.toURL()}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={styles.avatarWrap}>
          <Avatar.Text
            size={avatarSize}
            label={(item.name || "?").slice(0, 1).toUpperCase()}
            style={styles.avatar}
          />
        </View>
      )}
      <View style={styles.tileFooter}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.tileName}>
          {item.name || "Thành viên"}
        </Text>
      </View>
    </View>
  );
}

export default function GroupCall({
  groupId,
  autoJoinMode,
}: {
  groupId: string;
  autoJoinMode?: CallMedia | null;
}) {
  const token = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const socket = useMemo(
    () => (token && currentUser?.id ? initSocket(String(currentUser.id), token) : null),
    [currentUser?.id, token],
  );
  const [open, setOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [incoming, setIncoming] = useState<CallMedia | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotes, setRemotes] = useState<RemoteStream[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [frontCamera, setFrontCamera] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const participants = useRef(new Map<string, Participant>());
  const pendingCandidates = useRef(new Map<string, Signal["candidate"][]>());
  const local = useRef<MediaStream | null>(null);
  const active = useRef(false);
  const autoJoinHandled = useRef(false);
  const callAudio = NativeModules.TravelCallAudio as
    | {
        setSpeakerEnabled: (enabled: boolean) => Promise<void>;
        resetAudioRoute: () => Promise<void>;
      }
    | undefined;

  const routeAudio = useCallback(
    (enabled: boolean) => {
      setSpeakerOn(enabled);
      void callAudio?.setSpeakerEnabled(enabled).catch(() => undefined);
    },
    [callAudio],
  );

  const closePeer = useCallback((socketId: string) => {
    peers.current.get(socketId)?.close();
    peers.current.delete(socketId);
    participants.current.delete(socketId);
    pendingCandidates.current.delete(socketId);
    setRemotes((items) => items.filter((item) => item.socketId !== socketId));
  }, []);

  const createPeer = useCallback(
    (participant: Participant) => {
      const existing = peers.current.get(participant.socketId);
      if (existing) return existing;

      const WebRTC = getWebRTCLibrary();
      if (!WebRTC) throw new Error("WebRTCNativeModuleMissing");
      const peer = new WebRTC.RTCPeerConnection(rtcConfig);
      local.current?.getTracks().forEach((track) => peer.addTrack(track, local.current!));
      (peer as any).addEventListener("icecandidate", (event: any) => {
        if (!event.candidate || !socket) return;
        socket.emit("call:signal", {
          groupId,
          targetSocketId: participant.socketId,
          signal: { type: "candidate", candidate: event.candidate.toJSON() },
        });
      });
      (peer as any).addEventListener("track", (event: any) => {
        const stream = event.streams[0];
        if (!stream) return;
        setRemotes((items) => [
          ...items.filter((item) => item.socketId !== participant.socketId),
          { ...participant, stream },
        ]);
      });
      (peer as any).addEventListener("connectionstatechange", () => {
        if (["failed", "closed"].includes(peer.connectionState)) {
          closePeer(participant.socketId);
        }
      });
      peers.current.set(participant.socketId, peer);
      participants.current.set(participant.socketId, participant);
      return peer;
    },
    [closePeer, groupId, socket],
  );

  const flushCandidates = useCallback(async (socketId: string, peer: RTCPeerConnection) => {
    for (const candidate of pendingCandidates.current.get(socketId) || []) {
      if (candidate) await peer.addIceCandidate(candidate);
    }
    pendingCandidates.current.delete(socketId);
  }, []);

  const leave = useCallback(() => {
    socket?.emit("call:leave", { groupId });
    peers.current.forEach((peer) => peer.close());
    peers.current.clear();
    participants.current.clear();
    pendingCandidates.current.clear();
    local.current?.getTracks().forEach((track) => track.stop());
    local.current = null;
    active.current = false;
    setLocalStream(null);
    setRemotes([]);
    setMicOn(true);
    setCameraOn(false);
    setFrontCamera(true);
    setSpeakerOn(false);
    void callAudio?.resetAudioRoute().catch(() => undefined);
    setJoining(false);
    setOpen(false);
  }, [callAudio, groupId, socket]);

  const ensureConnected = useCallback(async () => {
    if (!socket) {
      throw createCallError(
        "CallConnectionError",
        "Chưa thể khởi tạo kết nối cuộc gọi. Vui lòng đăng nhập lại.",
      );
    }
    if (socket.connected) return;
    await new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        socket.off("connect", onConnect);
        socket.off("connect_error", onError);
      };
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(createCallError(
          "CallConnectionError",
          "Không thể xác thực kết nối cuộc gọi. Vui lòng đăng nhập lại hoặc thử lại.",
        ));
      };
      socket.once("connect", onConnect);
      socket.once("connect_error", onError);
      timer = setTimeout(() => {
        cleanup();
        reject(createCallError(
          "CallConnectionError",
          "Kết nối đến máy chủ cuộc gọi bị quá thời gian. Vui lòng kiểm tra mạng và thử lại.",
        ));
      }, CALL_JOIN_TIMEOUT_MS);

      if (socket.connected) onConnect();
      else socket.connect();
    });
  }, [socket]);

  const join = useCallback(
    async (mode: CallMedia) => {
      if (joining || active.current) return;
      setJoining(true);
      try {
        const WebRTC = getWebRTCLibrary();
        if (!WebRTC) {
          Alert.alert(
            "Cần cài lại ứng dụng",
            "Bản app đang chạy chưa chứa WebRTC native. Hãy tạo development build mới rồi cài lại; reload Metro hoặc npm install không thể cập nhật phần native của APK.",
          );
          return;
        }
        await ensureConnected();
        const stream = await WebRTC.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video" ? { facingMode: "user" } : false,
        });
        local.current = stream;
        // Mark the local call active before the server broadcasts
        // `call:started`, otherwise the caller can receive its own incoming UI.
        active.current = true;
        setLocalStream(stream);
        setMicOn(true);
        setCameraOn(mode === "video");
        setFrontCamera(true);
        routeAudio(mode === "video");
        setIncoming(null);
        setOpen(true);

        await ensureConnected();
        if (!socket?.connected) {
          throw createCallError(
            "CallConnectionError",
            "Kết nối máy chủ cuộc gọi đã bị ngắt. Vui lòng kiểm tra mạng và thử lại.",
          );
        }
        await new Promise<void>((resolve, reject) => {
          socket.timeout(CALL_JOIN_TIMEOUT_MS).emit(
            "call:join",
            { groupId, media: mode },
            (error: Error | null, response?: { ok: boolean; message?: string }) => {
              if (error) {
                reject(createCallError(
                  "CallConnectionError",
                  "Máy chủ cuộc gọi không phản hồi. Vui lòng kiểm tra mạng và thử lại.",
                ));
              } else if (!response?.ok) {
                reject(createCallError(
                  "CallRoomError",
                  response?.message || "Không thể tham gia phòng gọi. Vui lòng thử lại.",
                ));
              } else {
                resolve();
              }
            },
          );
        });
      } catch (error) {
        leave();
        Alert.alert(
          "Không thể bắt đầu cuộc gọi",
          getCallErrorMessage(error),
        );
      } finally {
        setJoining(false);
      }
    },
    [ensureConnected, groupId, joining, leave, routeAudio, socket],
  );

  useEffect(() => {
    if (!socket) return;
    const onStarted = (data: { groupId: string; media: CallMedia }) => {
      if (data.groupId === groupId && !active.current) setIncoming(data.media);
    };
    const onEnded = (data: { groupId: string }) => {
      if (data.groupId === groupId && !active.current) setIncoming(null);
    };
    const onParticipants = async (data: { groupId: string; participants: Participant[] }) => {
      if (data.groupId !== groupId) return;
      for (const participant of data.participants) {
        const peer = createPeer(participant);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("call:signal", {
          groupId,
          targetSocketId: participant.socketId,
          signal: { type: "offer", sdp: offer },
        });
      }
    };
    const onJoined = (participant: Participant & { groupId: string }) => {
      if (participant.groupId === groupId) {
        participants.current.set(participant.socketId, participant);
      }
    };
    const onSignal = async (data: Participant & { groupId: string; fromSocketId: string; signal: Signal }) => {
      if (data.groupId !== groupId || !local.current) return;
      const participant = participants.current.get(data.fromSocketId) || {
        socketId: data.fromSocketId,
        userId: data.userId,
        name: data.name,
      };
      const peer = createPeer(participant);
      if (data.signal.type === "candidate" && data.signal.candidate) {
        if (peer.remoteDescription) await peer.addIceCandidate(data.signal.candidate);
        else {
          pendingCandidates.current.set(data.fromSocketId, [
            ...(pendingCandidates.current.get(data.fromSocketId) || []),
            data.signal.candidate,
          ]);
        }
      } else if (data.signal.type === "offer" && data.signal.sdp) {
        await peer.setRemoteDescription(data.signal.sdp);
        await flushCandidates(data.fromSocketId, peer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("call:signal", {
          groupId,
          targetSocketId: data.fromSocketId,
          signal: { type: "answer", sdp: answer },
        });
      } else if (data.signal.type === "answer" && data.signal.sdp) {
        await peer.setRemoteDescription(data.signal.sdp);
        await flushCandidates(data.fromSocketId, peer);
      }
    };
    const onLeft = (data: { groupId: string; socketId: string }) => {
      if (data.groupId === groupId) closePeer(data.socketId);
    };
    const onCallError = (data: { message?: string }) => {
      if (!active.current) return;
      leave();
      Alert.alert("Cuộc gọi bị gián đoạn", data.message || "Không thể tiếp tục cuộc gọi.");
    };

    socket.on("call:started", onStarted);
    socket.on("call:ended", onEnded);
    socket.on("call:participants", onParticipants);
    socket.on("call:user-joined", onJoined);
    socket.on("call:signal", onSignal);
    socket.on("call:user-left", onLeft);
    socket.on("call:error", onCallError);
    return () => {
      socket.off("call:started", onStarted);
      socket.off("call:ended", onEnded);
      socket.off("call:participants", onParticipants);
      socket.off("call:user-joined", onJoined);
      socket.off("call:signal", onSignal);
      socket.off("call:user-left", onLeft);
      socket.off("call:error", onCallError);
    };
  }, [closePeer, createPeer, flushCandidates, groupId, leave, socket]);

  useEffect(() => {
    if (!autoJoinMode || autoJoinHandled.current) return;
    autoJoinHandled.current = true;
    void join(autoJoinMode);
  }, [autoJoinMode, join]);

  useEffect(() => () => {
    if (active.current) socket?.emit("call:leave", { groupId });
    peers.current.forEach((peer) => peer.close());
    local.current?.getTracks().forEach((track) => track.stop());
    void callAudio?.resetAudioRoute().catch(() => undefined);
  }, [callAudio, groupId, socket]);

  const localParticipant = localStream
    ? { socketId: "local", userId: String(currentUser?.id || ""), name: "Bạn", stream: localStream }
    : null;
  const callParticipants = localParticipant
    ? [localParticipant, ...remotes]
    : remotes;
  const participantCount = Math.max(callParticipants.length, 1);
  const isPortrait = stageSize.height >= stageSize.width;
  const columnCount = getCallGridColumnCount(
    participantCount,
    stageSize.width,
    stageSize.height,
  );
  const rowCount = Math.ceil(participantCount / columnCount);
  const visibleRowCount = participantCount > 4 ? Math.min(rowCount, 2) : rowCount;
  const availableWidth = Math.max(
    stageSize.width
      - CALL_STAGE_PADDING * 2
      - CALL_TILE_GAP * (columnCount - 1),
    0,
  );
  const availableHeight = Math.max(
    stageSize.height
      - CALL_STAGE_PADDING * 2
      - CALL_TILE_GAP * (visibleRowCount - 1),
    0,
  );
  const tileWidth = Math.max(Math.floor(availableWidth / columnCount), 1);
  const fittedTileHeight = Math.floor(availableHeight / visibleRowCount);
  let maxTileHeight = tileWidth * 1.2;
  if (participantCount === 1) maxTileHeight = tileWidth * 1.18;
  else if (isPortrait && columnCount === 1) maxTileHeight = tileWidth * 0.78;
  const tileHeight = Math.max(
    Math.min(fittedTileHeight, maxTileHeight),
    Math.min(132, fittedTileHeight || 132),
  );
  const avatarSize = Math.max(
    52,
    Math.min(84, Math.floor(Math.min(tileWidth, tileHeight) * 0.34)),
  );
  const compactControls = stageSize.width > 0 && stageSize.width < 360;

  const handleStageLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStageSize((current) => (
      Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1
        ? current
        : { width, height }
    ));
  }, []);

  return (
    <>
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityLabel="Gọi thoại nhóm"
          disabled={joining}
          onPress={() => void join("audio")}
          style={styles.actionButton}
        >
          <Ionicons name="call" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Gọi video nhóm"
          disabled={joining}
          onPress={() => void join("video")}
          style={styles.actionButton}
        >
          <Ionicons name="videocam" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {!!incoming && !open && (
        <TouchableOpacity style={styles.incoming} onPress={() => void join(incoming)}>
          <Ionicons name={incoming === "video" ? "videocam" : "call"} size={17} color="#fff" />
          <Text style={styles.incomingText}>Tham gia cuộc gọi</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={open}
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={leave}
      >
        <SafeAreaView style={styles.callScreen} edges={["top", "bottom"]}>
          <View style={styles.callHeader}>
            <View style={styles.callHeading}>
              <Text numberOfLines={1} style={styles.callTitle}>Cuộc gọi nhóm</Text>
              <Text numberOfLines={1} style={styles.callSubtitle}>
                {callParticipants.length} người tham gia
              </Text>
            </View>
            <TouchableOpacity accessibilityLabel="Kết thúc cuộc gọi" onPress={leave} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.stage} onLayout={handleStageLayout}>
            {stageSize.width > 0 && stageSize.height > 0 && (
              <ScrollView
                style={styles.stageScroll}
                contentContainerStyle={[styles.tiles, { minHeight: stageSize.height }]}
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
              >
                {callParticipants.map((participant) => (
                  <CallTile
                    key={participant.socketId}
                    item={participant}
                    width={tileWidth}
                    height={tileHeight}
                    avatarSize={avatarSize}
                    mirror={participant.socketId === "local" && frontCamera}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          <View style={[styles.controls, compactControls && styles.controlsCompact]}>
            <TouchableOpacity
              accessibilityLabel={micOn ? "Tắt micro" : "Bật micro"}
              onPress={() => {
                const enabled = !micOn;
                local.current?.getAudioTracks().forEach((track) => { track.enabled = enabled; });
                setMicOn(enabled);
              }}
              style={[styles.controlButton, compactControls && styles.controlButtonCompact]}
            >
              <Ionicons name={micOn ? "mic" : "mic-off"} size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={cameraOn ? "Tắt camera" : "Bật camera"}
              disabled={!local.current?.getVideoTracks().length}
              onPress={() => {
                const enabled = !cameraOn;
                local.current?.getVideoTracks().forEach((track) => { track.enabled = enabled; });
                setCameraOn(enabled);
              }}
              style={[
                styles.controlButton,
                compactControls && styles.controlButtonCompact,
                !local.current?.getVideoTracks().length && styles.disabledButton,
              ]}
            >
              <Ionicons name={cameraOn ? "videocam" : "videocam-off"} size={25} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Đổi camera trước/sau"
              disabled={!local.current?.getVideoTracks().length}
              onPress={() => {
                const videoTrack = local.current?.getVideoTracks()[0] as unknown as
                  | { _switchCamera?: () => void }
                  | undefined;
                if (!videoTrack?._switchCamera) return;
                videoTrack._switchCamera();
                setFrontCamera((front) => !front);
              }}
              style={[
                styles.controlButton,
                compactControls && styles.controlButtonCompact,
                !local.current?.getVideoTracks().length && styles.disabledButton,
              ]}
            >
              <Ionicons name="camera-reverse" size={25} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={speakerOn ? "Tắt loa ngoài" : "Bật loa ngoài"}
              onPress={() => routeAudio(!speakerOn)}
              style={[styles.controlButton, compactControls && styles.controlButtonCompact]}
            >
              <Ionicons name={speakerOn ? "volume-high" : "volume-mute"} size={25} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Kết thúc cuộc gọi"
              onPress={leave}
              style={[styles.endButton, compactControls && styles.endButtonCompact]}
            >
              <Ionicons name="call" size={25} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", alignItems: "center", gap: 2 },
  actionButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  incoming: { position: "absolute", top: 68, alignSelf: "center", zIndex: 50, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "#16A34A", elevation: 6 },
  incomingText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  callScreen: { flex: 1, backgroundColor: "#111315" },
  callHeader: { minHeight: 68, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#34383D" },
  callHeading: { flex: 1, minWidth: 0, paddingRight: 12 },
  callTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  callSubtitle: { color: "rgba(255,255,255,.68)", marginTop: 3, fontSize: 12 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#303438" },
  stage: { flex: 1, minHeight: 0 },
  stageScroll: { flex: 1 },
  tiles: { flexGrow: 1, padding: CALL_STAGE_PADDING, flexDirection: "row", flexWrap: "wrap", gap: CALL_TILE_GAP, justifyContent: "center", alignContent: "center" },
  tile: { borderRadius: 18, overflow: "hidden", backgroundColor: "#25282C" },
  avatarWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 34 },
  avatar: { backgroundColor: COLORS.primary },
  tileFooter: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 38, justifyContent: "center", paddingHorizontal: 12, backgroundColor: "rgba(0,0,0,.48)" },
  tileName: { color: "#fff", fontSize: 12, fontWeight: "700", lineHeight: 16, textShadowColor: "#000", textShadowRadius: 3 },
  controls: { minHeight: 88, paddingHorizontal: 8, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-evenly" },
  controlsCompact: { minHeight: 82, paddingHorizontal: 4, paddingVertical: 8 },
  controlButton: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "#303438" },
  controlButtonCompact: { width: 44, height: 44, borderRadius: 22 },
  disabledButton: { opacity: 0.35 },
  endButton: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: "#DC2626" },
  endButtonCompact: { width: 54, height: 54, borderRadius: 27 },
});
