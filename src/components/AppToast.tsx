import Toast, { BaseToast, ErrorToast, type ToastConfig } from "react-native-toast-message";
import { useAppPalette } from "@/src/hook/useAppPalette";

export const AppToastContainer = () => {
  const palette = useAppPalette();
  const textStyles = {
    text1Style: { color: palette.textPrimary },
    text2Style: { color: palette.textSecondary },
  };
  const config: ToastConfig = {
    success: (props) => <BaseToast {...props} {...textStyles} style={{ backgroundColor: palette.surfaceRaised, borderLeftColor: palette.success }} />,
    error: (props) => <ErrorToast {...props} {...textStyles} style={{ backgroundColor: palette.surfaceRaised, borderLeftColor: palette.error }} />,
    info: (props) => <BaseToast {...props} {...textStyles} style={{ backgroundColor: palette.surfaceRaised, borderLeftColor: palette.info }} />,
  };
  return <Toast config={config} />;
};

export const AppToast = {
  show: ({
    title,
    message,
    type = "success",
  }: {
    title: string;
    message: string;
    type?: "success" | "error" | "info";
  }) => {
    Toast.show({
      type: type,
      text1: title,
      text2: message,
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 50,
    });
  },
  hide: () => Toast.hide(),
};
