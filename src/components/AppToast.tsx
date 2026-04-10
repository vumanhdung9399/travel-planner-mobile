import Toast from "react-native-toast-message";

export const AppToastContainer = () => {
  return <Toast />;
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
