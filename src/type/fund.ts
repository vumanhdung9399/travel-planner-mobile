import type { UserGroup } from "./user";

export interface TripFund {
  id: string;
  amount: number;
  note?: string;
  createdAt: string;
  user: UserGroup;
}

export interface CreateTripFundDto {
  contributions: Array<{
    userId: string;
    amount: number;
  }>;
  note?: string;
}
