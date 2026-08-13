import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@travel-planner/offline/v1/';
const INDEX_KEY = `${PREFIX}index`;
const MAX_ENTRIES = 80;

export interface OfflineCacheEntry<T = unknown> { data: T; cachedAt: string; url: string; }

const hash = (value: string) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
};

export const isOfflineCacheable = (method?: string, url?: string) => {
  if ((method || 'get').toLowerCase() !== 'get' || !url) return false;
  if (url.includes('/access') || url.includes('/auth/') || url.includes('users/me')) return false;
  return ['trips', 'groups', 'timelines', 'expenses', 'tasks', 'trip-funds', 'maps', 'polls/group', 'trip-documents/trip'].some((part) => url.includes(part));
};

export const cacheKey = (userId: string | undefined, url: string, params?: unknown) =>
  `${PREFIX}${userId || 'anonymous'}/${hash(`${url}|${JSON.stringify(params || {})}`)}`;

export async function writeOfflineCache(key: string, entry: OfflineCacheEntry) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    const stored = JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) || '[]') as { key: string; cachedAt: string }[];
    const next = [{ key, cachedAt: entry.cachedAt }, ...stored.filter((item) => item.key !== key)].slice(0, MAX_ENTRIES);
    const removed = stored.filter((item) => !next.some((kept) => kept.key === item.key)).map((item) => item.key);
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));
    if (removed.length) await AsyncStorage.multiRemove(removed);
  } catch (error) { console.warn('[Offline] Could not cache response', error); }
}

export async function readOfflineCache<T>(key: string): Promise<OfflineCacheEntry<T> | null> {
  try { const value = await AsyncStorage.getItem(key); return value ? JSON.parse(value) : null; }
  catch { return null; }
}

export async function getOfflineCacheInfo() {
  const stored = JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) || '[]') as { key: string; cachedAt: string }[];
  return { count: stored.length, lastCachedAt: stored[0]?.cachedAt || null };
}

export async function clearOfflineCache() {
  const stored = JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) || '[]') as { key: string }[];
  await AsyncStorage.multiRemove([...stored.map((item) => item.key), INDEX_KEY]);
}
