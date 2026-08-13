import { api } from './api';
import type { GroupPoll, PollType, VotingMethod } from '../type/poll';

export const pollApi = {
  list: (groupId: string) => api.get<GroupPoll[]>(`/polls/group/${groupId}`),
  create: (groupId: string, payload: { question: string; description?: string; type: PollType; votingMethod: VotingMethod; tripId?: string; deadline?: string; options: string[] }) =>
    api.post<GroupPoll>(`/polls/group/${groupId}`, payload),
  vote: (pollId: string, optionIds: string[]) => api.patch<GroupPoll>(`/polls/${pollId}/vote`, { optionIds }),
  rank: (pollId: string, rankedOptionIds: string[]) => api.patch<GroupPoll>(`/polls/${pollId}/vote`, { optionIds: [], rankedOptionIds }),
  addOption: (pollId: string, label: string, metadata?: Record<string, unknown>) => api.post<GroupPoll>(`/polls/${pollId}/options`, { label, metadata }),
  remind: (pollId: string) => api.post<{ sent: number }>(`/polls/${pollId}/remind`),
  close: (pollId: string, payload?: { addToTimeline?: boolean; day?: number; time?: string; notify?: boolean }) => api.patch<GroupPoll>(`/polls/${pollId}/close`, payload || {}),
  remove: (pollId: string) => api.delete(`/polls/${pollId}`),
};
