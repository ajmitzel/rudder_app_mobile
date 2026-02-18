import { StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  fetchInbox,
  acceptReceiptSuggestion,
  listQueuedReceipts,
  processReceiptUploadQueue,
  retryAllQueuedReceipts,
  retryQueuedReceipt,
  QueuedReceipt,
  ReceiptSuggestion,
} from '@/services/receipts';
import { ApiAuthError } from '@/services/api';
import { ReceiptBottomBar } from '@/components/receipt-bottom-bar';
import { formatAmount } from '@/services/format';

export default function ReceiptInboxScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState<ReceiptSuggestion[]>([]);
  const [suggested, setSuggested] = useState<ReceiptSuggestion[]>([]);
  const [matched, setMatched] = useState<ReceiptSuggestion[]>([]);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [queued, setQueued] = useState<QueuedReceipt[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'suggested' | 'manual' | 'matched'>('suggested');
  const PAGE_SIZE = 15;

  const refreshInbox = async () => {
    const queue = await processReceiptUploadQueue();
    const pending = queue.filter((q) => q.status !== 'uploaded');
    setPendingUploads(pending.length);
    setQueued(pending);

    const suggestions = await fetchInbox();
    setUnmatched(suggestions.filter((s) => s.status === 'UNMATCHED'));
    setSuggested(suggestions.filter((s) => s.status === 'SUGGESTED'));
    setMatched(suggestions.filter((s) => s.status === 'MATCHED'));
  };

  useEffect(() => {
    const loadInbox = async () => {
      setLoading(true);
      setError(null);
      try {
        await refreshInbox();
      } catch (err) {
        if (err instanceof ApiAuthError) {
          router.replace('/login');
          return;
        }
        const queue = await listQueuedReceipts();
        const pending = queue.filter((q) => q.status !== 'uploaded');
        setPendingUploads(pending.length);
        setQueued(pending);
        setError(err instanceof Error ? err.message : 'Failed to load inbox.');
      } finally {
        setLoading(false);
      }
    };

    loadInbox();
    const timer = setInterval(() => {
      refreshInbox().catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [router]);

  const onRetryOne = async (id: string) => {
    setRetryingId(id);
    const queue = await retryQueuedReceipt(id);
    const pending = queue.filter((q) => q.status !== 'uploaded');
    setPendingUploads(pending.length);
    setQueued(pending);
    setRetryingId(null);
  };

  const onRetryAll = async () => {
    setRetryingAll(true);
    const queue = await retryAllQueuedReceipts();
    const pending = queue.filter((q) => q.status !== 'uploaded');
    setPendingUploads(pending.length);
    setQueued(pending);
    setRetryingAll(false);
  };

  const onAcceptMatch = async (id: string) => {
    setAcceptingId(id);
    setError(null);
    try {
      await acceptReceiptSuggestion(id);
      await refreshInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accept match failed.');
    } finally {
      setAcceptingId(null);
    }
  };

  const toAbsoluteReceiptUrl = (value?: string | null) => {
    if (!value) {
      return null;
    }
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
    const origin = baseUrl.replace(/\/api\/v1\/?$/, '');
    return `${origin}${value.startsWith('/') ? '' : '/'}${value}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
      <ThemedText type="title">Receipts Inbox</ThemedText>
      <ThemedText style={styles.subtitle}>
        Unmatched receipts waiting for review.
      </ThemedText>
      <ThemedView style={styles.segmented}>
        <Pressable
          style={[styles.segmentButton, activeTab === 'suggested' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('suggested')}
        >
          <ThemedText
            style={[
              styles.segmentText,
              activeTab === 'suggested' && styles.segmentTextActive,
            ]}
          >
            Suggested ({suggested.length})
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.segmentButton, activeTab === 'manual' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('manual')}
        >
          <ThemedText
            style={[
              styles.segmentText,
              activeTab === 'manual' && styles.segmentTextActive,
            ]}
          >
            Manual Match ({unmatched.length})
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.segmentButton,
            styles.segmentButtonLast,
            activeTab === 'matched' && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveTab('matched')}
        >
          <ThemedText
            style={[
              styles.segmentText,
              activeTab === 'matched' && styles.segmentTextActive,
            ]}
          >
            Matched ({matched.length})
          </ThemedText>
        </Pressable>
      </ThemedView>
      {pendingUploads > 0 ? (
        <ThemedView style={styles.pendingCard}>
          <ThemedText style={styles.pendingText}>
            {pendingUploads} receipt{pendingUploads === 1 ? '' : 's'} pending upload.
          </ThemedText>
          <Pressable style={styles.retryAllButton} onPress={onRetryAll} disabled={retryingAll}>
            <ThemedText style={styles.retryAllButtonText}>
              {retryingAll ? 'Retrying…' : 'Retry all'}
            </ThemedText>
          </Pressable>
          <ScrollView contentContainerStyle={styles.pendingList}>
            {queued.map((item) => (
              <ThemedView key={item.id} style={styles.pendingItem}>
                <Image source={{ uri: item.uri }} style={styles.pendingThumb} />
                <ThemedView style={styles.pendingMeta}>
                  <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                  <ThemedText style={styles.pendingSubText}>
                    Status: {item.status} · Retries: {item.retries}
                  </ThemedText>
                  {item.lastError ? (
                    <ThemedText style={styles.pendingErrorText}>{item.lastError}</ThemedText>
                  ) : null}
                </ThemedView>
                <Pressable
                  style={styles.retryOneButton}
                  onPress={() => onRetryOne(item.id)}
                  disabled={retryingId === item.id}
                >
                  <ThemedText style={styles.retryOneButtonText}>
                    {retryingId === item.id ? '…' : 'Retry'}
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ))}
          </ScrollView>
        </ThemedView>
      ) : null}

      {loading ? (
        <ThemedText style={styles.cardText}>Loading receipts…</ThemedText>
      ) : error ? (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {activeTab === 'suggested' ? (
            suggested.length === 0 ? (
              <ThemedText style={styles.cardText}>No suggested matches right now.</ThemedText>
            ) : (
              suggested.slice(0, PAGE_SIZE).map((item) => (
                <ThemedView key={item.id} style={styles.card}>
                  {toAbsoluteReceiptUrl(item.receipt_file_url) ? (
                    <Image
                      source={{ uri: toAbsoluteReceiptUrl(item.receipt_file_url)! }}
                      style={styles.receiptThumb}
                    />
                  ) : null}
                  <ThemedText type="defaultSemiBold">{item.suggested_vendor || 'Unknown vendor'}</ThemedText>
                  <ThemedText style={styles.cardText}>
                    {item.suggested_date || 'Unknown date'} ·{' '}
                    {formatAmount(item.suggested_total)}
                  </ThemedText>
                  <Pressable
                    style={styles.acceptButton}
                    onPress={() => onAcceptMatch(item.id)}
                    disabled={acceptingId === item.id}
                  >
                    <ThemedText style={styles.acceptButtonText}>
                      {acceptingId === item.id ? 'Accepting…' : 'Accept Match'}
                    </ThemedText>
                  </Pressable>
                  <Link
                    href={{ pathname: '/receipts/manual-match', params: { suggestionId: item.id } }}
                    style={styles.secondaryButton}
                  >
                    Match Manually
                  </Link>
                </ThemedView>
              ))
            )
          ) : activeTab === 'manual' ? (
            unmatched.length === 0 ? (
              <ThemedText style={styles.cardText}>No unmatched receipts.</ThemedText>
            ) : (
              unmatched.slice(0, PAGE_SIZE).map((item) => (
                <ThemedView key={item.id} style={styles.card}>
                  {toAbsoluteReceiptUrl(item.receipt_file_url) ? (
                    <Image
                      source={{ uri: toAbsoluteReceiptUrl(item.receipt_file_url)! }}
                      style={styles.receiptThumb}
                    />
                  ) : null}
                  <ThemedText type="subtitle">{item.suggested_vendor || 'Unknown vendor'}</ThemedText>
                  <ThemedText style={styles.cardText}>
                    {item.suggested_date || 'Unknown date'} ·{' '}
                    {formatAmount(item.suggested_total)}
                  </ThemedText>
                  <Link
                    href={{ pathname: '/receipts/manual-match', params: { suggestionId: item.id } }}
                    style={styles.secondaryButton}
                  >
                    Match Manually
                  </Link>
                </ThemedView>
              ))
            )
          ) : matched.length === 0 ? (
            <ThemedText style={styles.cardText}>No matched receipts yet.</ThemedText>
          ) : (
            matched.slice(0, PAGE_SIZE).map((item) => (
              <ThemedView key={item.id} style={styles.card}>
                {toAbsoluteReceiptUrl(item.receipt_file_url) ? (
                  <Image
                    source={{ uri: toAbsoluteReceiptUrl(item.receipt_file_url)! }}
                    style={styles.receiptThumb}
                  />
                ) : null}
                <ThemedText type="subtitle">{item.suggested_vendor || 'Unknown vendor'}</ThemedText>
                <ThemedText style={styles.cardText}>
                  {item.suggested_date || 'Unknown date'} · {formatAmount(item.suggested_total)}
                </ThemedText>
              </ThemedView>
            ))
          )}
        </ScrollView>
      )}
        <ReceiptBottomBar
          queuedCount={pendingUploads}
          suggestedCount={suggested.length}
          unmatchedCount={unmatched.length}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
    paddingBottom: 120,
  },
  subtitle: {
    opacity: 0.8,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.2)',
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRightWidth: 1,
    borderRightColor: 'rgba(127,127,127,0.2)',
  },
  segmentButtonLast: {
    borderRightWidth: 0,
  },
  segmentButtonActive: {
    backgroundColor: '#0f172a',
  },
  segmentText: {
    color: '#0f172a',
    fontSize: 13,
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  cardText: {
    opacity: 0.8,
  },
  errorText: {
    color: '#dc2626',
  },
  pendingText: {
    color: '#0f172a',
    fontSize: 13,
    opacity: 0.8,
  },
  pendingCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.2)',
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  retryAllButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  retryAllButtonText: {
    color: '#ffffff',
  },
  pendingList: {
    gap: 8,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.2)',
    backgroundColor: '#ffffff',
  },
  pendingThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  pendingMeta: {
    flex: 1,
    gap: 2,
  },
  pendingSubText: {
    fontSize: 12,
    opacity: 0.7,
  },
  pendingErrorText: {
    fontSize: 12,
    color: '#b91c1c',
  },
  retryOneButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  retryOneButtonText: {
    color: '#ffffff',
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.2)',
    gap: 8,
  },
  receiptThumb: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  acceptButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
  },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    textAlign: 'center',
    borderRadius: 10,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    overflow: 'hidden',
  },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    textAlign: 'center',
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
    overflow: 'hidden',
  },
});
