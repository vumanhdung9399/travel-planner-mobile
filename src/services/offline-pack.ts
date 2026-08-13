import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from './api';

const PREFIX = '@travel-planner/trip-pack/v1/';
export type TripPack = { version: number; generatedAt: string; trip: { id: string; name: string }; documents: { id: string; sourceType?: string }[]; maps: { id: string; routerFileName?: string }[]; [key: string]: unknown };
const packDir = (tripId: string) => `${FileSystem.documentDirectory}travel-planner/${tripId}/`;

export async function downloadTripPack(tripId: string, onProgress?: (value: number) => void) {
  const pack = (await api.get<TripPack>(`/offline/trips/${tripId}/pack`)).data;
  const directory = packDir(tripId); await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const items: { url: string; name: string; documentId?: string; mapId?: string }[] = [];
  for (const document of pack.documents.filter((item) => item.sourceType !== 'text')) {
    try { const { url } = (await api.get<{ url: string }>(`/trip-documents/${document.id}/access`)).data; items.push({ url, name: `document-${document.id}`, documentId: document.id }); } catch { /* keep metadata */ }
  }
  for (const map of pack.maps) if (map.routerFileName) items.push({ url: map.routerFileName, name: `map-${map.id}.json`, mapId: map.id });
  const offlineFiles: Record<string, string> = {};
  const offlineMaps: Record<string, string> = {};
  for (let index = 0; index < items.length; index += 1) {
    const destination = `${directory}${items[index].name}`;
    try {
      await FileSystem.downloadAsync(items[index].url, destination);
      const documentId = items[index].documentId;
      if (documentId) offlineFiles[documentId] = destination;
      const mapId = items[index].mapId;
      if (mapId) offlineMaps[mapId] = destination;
    } catch { /* remaining pack is still useful */ }
    onProgress?.((index + 1) / Math.max(items.length, 1));
  }
  pack.offlineFiles = offlineFiles;
  pack.offlineMaps = offlineMaps;
  await AsyncStorage.setItem(`${PREFIX}${tripId}`, JSON.stringify(pack)); onProgress?.(1); return pack;
}
export async function getTripPack(tripId: string): Promise<TripPack | null> { try { const value = await AsyncStorage.getItem(`${PREFIX}${tripId}`); return value ? JSON.parse(value) : null; } catch { return null; } }
export async function getOfflineDocumentPath(tripId: string, documentId: string) {
  const pack = await getTripPack(tripId);
  const path = (pack?.offlineFiles as Record<string, string> | undefined)?.[documentId];
  if (!path || !(await FileSystem.getInfoAsync(path)).exists) return null;
  return path;
}
export async function getOfflineMapPath(tripId: string, mapId: string) {
  const pack = await getTripPack(tripId);
  const path = (pack?.offlineMaps as Record<string, string> | undefined)?.[mapId];
  if (!path || !(await FileSystem.getInfoAsync(path)).exists) return null;
  return path;
}
export async function removeTripPack(tripId: string) { await AsyncStorage.removeItem(`${PREFIX}${tripId}`); await FileSystem.deleteAsync(packDir(tripId), { idempotent: true }); }
