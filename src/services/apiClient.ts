export const apiClient = async <T>(
  fn: () => Promise<any>,
): Promise<T | null> => {
  try {
    const res = await fn();
    return res.data;
  } catch (err: any) {
    throw err?.response?.data?.message || "Có lỗi xảy ra";
  }
};
