import { forwardRef, useImperativeHandle, type ReactNode } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Text } from "react-native-paper";
import { useAppPalette } from "@/src/hook/useAppPalette";

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type MapPressEvent = {
  nativeEvent: { coordinate: LatLng };
};

export const PROVIDER_GOOGLE = "google";

type WebMapHandle = {
  fitToCoordinates: (points: LatLng[], options?: unknown) => void;
  animateCamera: (camera: unknown, options?: unknown) => void;
};

const WebMapView = forwardRef<WebMapHandle, any>(
  (
    { children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> },
    ref,
  ) => {
    const palette = useAppPalette();

    useImperativeHandle(ref, () => ({
      fitToCoordinates: () => undefined,
      animateCamera: () => undefined,
    }));

    return (
      <View
        style={[
          styles.map,
          { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
          style,
        ]}
      >
        <View style={styles.message}>
          <Text variant="titleMedium" style={{ color: palette.textPrimary }}>
            Bản đồ khả dụng trên ứng dụng mobile
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.hint, { color: palette.textSecondary }]}
          >
            Các biểu mẫu và dữ liệu tuyến đường vẫn có thể được kiểm tra trên web.
          </Text>
        </View>
        {children}
      </View>
    );
  },
);

WebMapView.displayName = "WebMapView";

export const Marker = () => null;
export const Polyline = () => null;

export default WebMapView;

const styles = StyleSheet.create({
  map: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCE8F3",
    borderWidth: StyleSheet.hairlineWidth,
  },
  message: {
    maxWidth: 360,
    alignItems: "center",
    padding: 24,
  },
  hint: {
    marginTop: 6,
    textAlign: "center",
  },
});
