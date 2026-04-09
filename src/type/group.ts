import type { Trip } from "./trip";
import type { UserGroup } from "./user";

export interface Group {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  name: string;
  description: string;
  isCreate: boolean;
  members: Member[];
  trips: Trip[];
}

interface Member {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user: UserGroup;
  role: string;
}

export interface CreateGroupData {
  name: string;
  description?: string;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
}
