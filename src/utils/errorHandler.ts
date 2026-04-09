import Toast from "react-native-toast-message";

export const handleApiError = (error: any) => {
  const status = error?.response?.status;
  const message = error?.response?.data?.message || "Có lỗi xảy ra";

  switch (status) {
    case 400:
      showError(message || "Dữ liệu không hợp lệ");
      break;

    case 401:
      showError("Phiên đăng nhập đã hết hạn");
      break;

    case 403:
      showError("Bạn không có quyền");
      break;

    case 404:
      showError("Không tìm thấy dữ liệu");
      break;

    case 500:
      showError("Server đang lỗi, thử lại sau");
      break;

    default:
      showError(message);
      break;
  }
};

export const showSuccess = (msg: string) => {
  Toast.show({
    type: "success",
    text1: "Thành công",
    text2: msg,
  });
};

export const showError = (msg: string) => {
  Toast.show({
    type: "error",
    text1: "Lỗi",
    text2: msg,
  });
};
