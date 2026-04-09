import * as yup from "yup";

export const profileSchema = yup.object({
  name: yup.string().required("Tên không được để trống"),
  bank: yup.string().required("Vui lòng chọn ngân hàng"),
  bankAccNumber: yup.string().required("Số tài khoản không được để trống"),
  phone: yup
    .string()
    .matches(/^[0-9]{9,11}$/, "Vui lòng nhập đúng định dạng")
    .required(),
});

export const changePasswordSchema = yup.object({
  currentPassword: yup
    .string()
    .required("Mật khẩu hiện tại không được để trống"),

  newPassword: yup
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .matches(/[a-zA-Z]/, "Mật khẩu phải chứa chữ cái")
    .matches(/[0-9]/, "Mật khẩu phải có số")
    .required("Vui lòng nhập mật khẩu"),

  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword")], "Mật khẩu không khớp")
    .required("Xác nhận mật khẩu"),
});
