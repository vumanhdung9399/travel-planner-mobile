export interface Pagination<T> {
  data: T[];
  total: number;
  page: number | string;
  limit: number | string;
  unreadTotal?: number;
}