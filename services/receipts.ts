import { apiFetch } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

export type ReceiptSuggestion = {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'UNMATCHED' | 'SUGGESTED' | 'MATCHED' | 'REJECTED';
  suggested_expense_id?: string | null;
  suggested_vendor?: string | null;
  suggested_date?: string | null;
  suggested_total?: number | null;
  suggested_confidence?: number | null;
  receipt_file_url?: string | null;
};

export type QueuedReceipt = {
  id: string;
  uri: string;
  name: string;
  type: string;
  status: 'pending' | 'uploading' | 'uploaded';
  retries: number;
  createdAt: string;
  uploadedAt?: string;
  suggestionId?: string;
  lastError?: string;
};

const RECEIPT_UPLOAD_QUEUE_KEY = 'receipt_upload_queue_v1';
let queueProcessing = false;

export async function uploadReceipt(
  uri: string,
  name: string,
  type: string
): Promise<ReceiptSuggestion> {
  const form = new FormData();
  form.append('receipt', {
    uri,
    name,
    type,
  } as any);

  const res = await apiFetch('/receipts/upload', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Upload failed');
  }
  const data = await res.json();
  return data.suggestion as ReceiptSuggestion;
}

export async function fetchInbox(): Promise<ReceiptSuggestion[]> {
  const res = await apiFetch('/receipts/inbox');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Inbox request failed');
  }
  const data = await res.json();
  return (data?.suggestions ?? []) as ReceiptSuggestion[];
}

export async function acceptReceiptSuggestion(suggestionId: string): Promise<void> {
  const res = await apiFetch(`/receipts/suggestions/${suggestionId}/accept`, {
    method: 'POST',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Accept match failed');
  }
}

async function loadQueue(): Promise<QueuedReceipt[]> {
  const raw = await AsyncStorage.getItem(RECEIPT_UPLOAD_QUEUE_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as QueuedReceipt[];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedReceipt[]): Promise<void> {
  await AsyncStorage.setItem(RECEIPT_UPLOAD_QUEUE_KEY, JSON.stringify(queue));
}

export async function listQueuedReceipts(): Promise<QueuedReceipt[]> {
  return loadQueue();
}

export async function enqueueReceiptUpload(uri: string, name: string, type: string): Promise<QueuedReceipt> {
  const queue = await loadQueue();
  const item: QueuedReceipt = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    uri,
    name,
    type,
    status: 'pending',
    retries: 0,
    createdAt: new Date().toISOString(),
  };
  queue.push(item);
  await saveQueue(queue);
  return item;
}

export async function processReceiptUploadQueue(): Promise<QueuedReceipt[]> {
  if (queueProcessing) {
    return loadQueue();
  }
  queueProcessing = true;
  try {
    const queue = await loadQueue();
    let changed = false;
    let uploadedCount = 0;
    for (const item of queue) {
      if (item.status === 'uploaded') {
        continue;
      }
      item.status = 'uploading';
      changed = true;
      try {
        const suggestion = await uploadReceipt(item.uri, item.name, item.type);
        item.status = 'uploaded';
        item.uploadedAt = new Date().toISOString();
        item.suggestionId = suggestion.id;
        item.lastError = undefined;
        uploadedCount += 1;
      } catch (err) {
        item.status = 'pending';
        item.retries += 1;
        item.lastError = err instanceof Error ? err.message : 'Upload failed';
      }
    }
    if (changed) {
      await saveQueue(queue);
    }
    if (uploadedCount > 0) {
      Toast.show({
        type: 'success',
        text1: `${uploadedCount} receipt${uploadedCount === 1 ? '' : 's'} uploaded`,
        position: 'bottom',
      });
    }
    return queue;
  } finally {
    queueProcessing = false;
  }
}

export async function retryQueuedReceipt(id: string): Promise<QueuedReceipt[]> {
  const queue = await loadQueue();
  const item = queue.find((q) => q.id === id);
  if (item && item.status !== 'uploaded') {
    item.status = 'pending';
    item.lastError = undefined;
    await saveQueue(queue);
  }
  return processReceiptUploadQueue();
}

export async function retryAllQueuedReceipts(): Promise<QueuedReceipt[]> {
  const queue = await loadQueue();
  let changed = false;
  for (const item of queue) {
    if (item.status !== 'uploaded') {
      item.status = 'pending';
      item.lastError = undefined;
      changed = true;
    }
  }
  if (changed) {
    await saveQueue(queue);
  }
  return processReceiptUploadQueue();
}
