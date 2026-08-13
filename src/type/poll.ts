export type PollStatus = "open" | "closed";
export type PollType = 'date' | 'hotel' | 'restaurant' | 'place' | 'custom';
export type VotingMethod = 'single' | 'multiple' | 'ranked';

export interface PollOption {
  id: string;
  label: string;
  position: number;
  voteCount: number;
  selectedByMe: boolean;
  rankByMe?: number | null;
  score: number;
  proposedBy?: { id: string; name?: string; avatar?: string };
  metadata?: Record<string, unknown> | null;
  voters: { id: string; name?: string; avatar?: string; rank?: number | null }[];
}

export interface GroupPoll {
  id: string;
  question: string;
  description?: string | null;
  allowMultiple: boolean;
  type: PollType;
  votingMethod: VotingMethod;
  deadline?: string | null;
  status: PollStatus;
  groupId: string;
  createdAt: string;
  totalVoters: number;
  tripId?: string | null;
  winningOptionId?: string | null;
  pendingVoters: { id: string; name?: string; avatar?: string }[];
  createdBy?: { id: string; name?: string; avatar?: string };
  options: PollOption[];
}
