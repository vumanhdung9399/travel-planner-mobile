import { useEffect, useRef } from "react";
import { NativeModules, Platform } from "react-native";

type TravelCallAudioModule = {
  canDisplayOverOtherApps?: () => Promise<boolean>;
  openOtherPermissionsSettings?: () => Promise<boolean>;
};

/**
 * Android bubbles can require MIUI's "Display pop-up windows" special access.
 * Android does not expose a public API for every manufacturer-specific item,
 * but it does expose this required overlay access. If it is absent, take the
 * user to the device's app permission screen when they open a chat bubble.
 */
export function useChatBubblePermissions() {
  const hasChecked = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "android" || hasChecked.current) return;
    hasChecked.current = true;

    const module = NativeModules.TravelCallAudio as
      | TravelCallAudioModule
      | undefined;
    if (
      !module?.canDisplayOverOtherApps ||
      !module.openOtherPermissionsSettings
    ) {
      return;
    }

    void module
      .canDisplayOverOtherApps()
      .then((allowed) => {
        if (!allowed) return module.openOtherPermissionsSettings?.();
        return undefined;
      })
      .catch((error) => {
        console.warn("[Permissions] Could not check chat bubble access:", error);
      });
  }, []);
}
