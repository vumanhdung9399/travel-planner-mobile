import type { UserGroup } from './user';

export interface TripTask {
  id: string;
  tripId: string;
  title: string;
  assigneeId: string | null;
  assignee?: UserGroup | null;
  isCompleted: boolean;
  dueDate: string | null;
  createdAt: string;
}

export type TaskFilter = 'all' | 'mine' | 'completed';
