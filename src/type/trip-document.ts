export type DocumentCategory = 'transport' | 'hotel' | 'ticket' | 'insurance' | 'identity' | 'other';
export type DocumentVisibility = 'group' | 'private';
export interface TripDocument {
  id: string; title: string; category: DocumentCategory; visibility: DocumentVisibility;
  reminderAt?: string | null; originalName: string; mimeType: string; size: number;
  tripId: string; uploadedById: string; createdAt: string;
  provider?: string | null; referenceCode?: string | null; address?: string | null; phone?: string | null;
  startsAt?: string | null; endsAt?: string | null; checkInAt?: string | null; cancelBefore?: string | null; expiresAt?: string | null;
  extractionStatus?: 'none' | 'pending' | 'complete' | 'failed'; sourceType?: 'file' | 'text';
  uploadedBy?: { id: string; name?: string; avatar?: string };
}
