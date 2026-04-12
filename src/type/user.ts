export interface UserGroup {
  id: string;
  name: string;
  avatar: string | null;
  bank?: string;
  bankAccNumber?: string;
  phone?: string;
  email?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string | null;
  phone: string;
  email: string;
  bank: string;
  bankAccNumber: string;
  stats: Stats;
}

interface Stats {
  groups: number;
  trips: number;
  timelines: number;
  expenses: number;
}
