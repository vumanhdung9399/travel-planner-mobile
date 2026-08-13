import { api } from './api';
import type { TripDocument } from '../type/trip-document';

export const tripDocumentApi = {
  list: (tripId: string) => api.get<TripDocument[]>(`/trip-documents/trip/${tripId}`),
  upload: (tripId: string, formData: FormData) => api.post<TripDocument>(`/trip-documents/trip/${tripId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }),
  access: (id: string) => api.get<{ url: string; expiresAt: string }>(`/trip-documents/${id}/access`),
  details: (id: string) => api.get<TripDocument & { extractedData?: Record<string, unknown> }>(`/trip-documents/${id}/details`),
  extract: (id: string) => api.post<TripDocument>(`/trip-documents/${id}/extract`),
  importText: (payload: { tripId: string; title: string; content: string; category: string; visibility: string; provider?: string; referenceCode?: string; address?: string; phone?: string; reminderAt?: string }) => api.post<TripDocument>('/trip-documents/import-text', payload),
  remove: (id: string) => api.delete(`/trip-documents/${id}`),
};
