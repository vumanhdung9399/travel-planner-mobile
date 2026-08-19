import { useEffect, useRef } from "react";
import {
  NativeModules,
  PermissionsAndroid,
  Platform,
} from "react-native";

/**
 * Requests the runtime permissions required by group calls as soon as the app
 * is ready. Keeping this separate from the call screen means the first call
 * does not have to wait for Android/iOS permission dialogs.
 */
export function useCallPermissions(isReady: boolean) {
  const hasRequested = useRef(false);

  useEffect(() => {
    if (!isReady || hasRequested.current) return;
    hasRequested.current = true;

    const requestPermissions = async () => {
      if (Platform.OS === "android") {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ];
        const results = await Promise.all(
          permissions.map((permission) => PermissionsAndroid.check(permission)),
        );
        const missingPermissions = permissions.filter(
          (_, index) => !results[index],
        );

        if (missingPermissions.length) {
          await PermissionsAndroid.requestMultiple(missingPermissions);
        }
        return;
      }

      // react-native-webrtc owns the native iOS camera/microphone permission
      // prompts. Stop the temporary stream immediately after the prompt.
      if (Platform.OS === "ios" && NativeModules.WebRTCModule) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { mediaDevices } = require("react-native-webrtc") as typeof import("react-native-webrtc");
        const stream = await mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    };

    // Let the first screen render and the splash screen close before showing
    // native dialogs; otherwise some Android devices drop the first request.
    const timer = setTimeout(() => {
      void requestPermissions().catch((error) => {
        console.warn("[Permissions] Could not request call permissions:", error);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [isReady]);
}
