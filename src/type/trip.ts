import type { UserGroup } from "./user";

export interface TimelineItemType {
  id?: string;
  title: string;
  description: string;
  time: string; // HH:mm
  notify: boolean;
  day: number; // day 1, day 2
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  note?: string;
  time: string;
  status: string;
  category: string;
  rejectionReason?: string;
  userId: string;
  createdBy: UserGroup;
  paidBy: UserGroup;
  participants: UserGroup[];
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  location?: string;
  infor?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  timelines: TimelineItemType[];
  expenses: ExpenseItem[];
  isLeader: boolean;
  group: Group,
  isCloseTrip: boolean;
}

interface Group {
  id: string;
  name: string;
  description: string;
  members: UserGroupRole[];
}

interface UserGroupRole extends UserGroup {
  role?: string;
}