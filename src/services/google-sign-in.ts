import { isRunningInExpoGo } from "expo";
import { Platform, TurboModuleRegistry } from "react-native";

type GoogleSignInModule = typeof import("@react-native-google-signin/google-signin");

export function getGoogleSignIn(): GoogleSignInModule | null {
  if (isRunningInExpoGo() || Platform.OS === "web" || !TurboModuleRegistry.get("RNGoogleSignin")) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@react-native-google-signin/google-signin") as GoogleSignInModule;
}
