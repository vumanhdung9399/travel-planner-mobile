import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AxiosRequestConfig } from 'axios';

const KEY = '@travel-planner/offline/mutations/v1';
export type QueuedMutation = { id: string; method: string; url: string; data: unknown; createdAt: string };
const read = async (): Promise<QueuedMutation[]> => { try { return JSON.parse((await AsyncStorage.getItem(KEY)) || '[]'); } catch { return []; } };
const write = (items: QueuedMutation[]) => AsyncStorage.setItem(KEY, JSON.stringify(items));
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const isQueueableMutation = (config?: AxiosRequestConfig) => {
  const method = config?.method?.toLowerCase(); const url = config?.url || '';
  return (method === 'patch' && /\/tasks\/[^/]+\/status/.test(url)) || (method === 'post' && /\/expenses\/[^/]+$/.test(url));
};

export async function enqueueMutation(config: AxiosRequestConfig) {
  const item: QueuedMutation = { id: id(), method: config.method || 'post', url: config.url || '', data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data, createdAt: new Date().toISOString() };
  const current = await read(); const next = /\/tasks\//.test(item.url) ? current.filter((queued) => queued.url !== item.url) : current;
  await write([...next, item]); return item;
}

export async function flushMutationQueue(send: (item: QueuedMutation) => Promise<unknown>) {
  const items = await read(); const remaining: QueuedMutation[] = []; let completed = 0;
  for (const item of items) { try { await send(item); completed += 1; } catch { remaining.push(item); } }
  await write(remaining); return { completed, pending: remaining.length };
}
export const mutationQueueCount = async () => (await read()).length;
