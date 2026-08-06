import { api } from './api';
import type { TripTask } from '../type/task';

export const taskApi = {
  list: (tripId: string) => api.get<TripTask[]>(`/tasks/trip/${tripId}`),
  create: (title: string, tripId: string) => api.post<TripTask>('/tasks', { title, tripId }),
  toggle: (taskId: string, isCompleted: boolean) => api.patch<TripTask>(`/tasks/${taskId}/status`, { isCompleted }),
  assign: (taskId: string, userId: string | null) => api.patch<TripTask>(`/tasks/${taskId}/assignee`, { userId }),
  delete: (taskId: string) => api.delete(`/tasks/${taskId}`),
};
