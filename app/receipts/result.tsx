import { StyleSheet, Pressable } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchInbox, ReceiptSuggestion } from '@/services/receipts';
import { ReceiptBottomBar } from '@/components/receipt-bottom-bar';
import { formatAmount } from '@/services/format';

export default function ReceiptResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [suggestion, setSuggestion] = useState<ReceiptSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSuggestion = async () => {
      try {
        const suggestions = await fetchInbox();
        const found = suggestions.find((s) => s.id === params.id);
        setSuggestion(found || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load suggestion.');
      } finally {
        setLoading(false);
      }
    };
    loadSuggestion();
  }, [params.id]);

  const isSuggested = suggestion?.status === 'SUGGESTED';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
      <ThemedText type="title">Receipt Uploaded</ThemedText>
      {loading ? (
        <ThemedText style={styles.cardText}>Loading match…</ThemedText>
      ) : error ? (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      ) : suggestion ? (
        <>
          <ThemedText style={styles.subtitle}>
            {isSuggested
              ? 'We found a likely match to an existing expense without a receipt.'
              : 'No strong match yet — added to inbox.'}
          </ThemedText>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">
              {isSuggested ? 'Suggested Match' : 'Receipt Saved'}
            </ThemedText>
            <ThemedText style={styles.cardText}>
              Vendor: {suggestion.suggested_vendor || 'Unknown'}
            </ThemedText>
            <ThemedText style={styles.cardText}>
              Date: {suggestion.suggested_date || 'Unknown'}
            </ThemedText>
            <ThemedText style={styles.cardText}>
              Amount:{' '}
              {formatAmount(suggestion.suggested_total)}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.actions}>
            {isSuggested ? (
              <Pressable style={styles.primaryButton} onPress={() => router.push('/receipts/inbox')}>
                <ThemedText style={styles.primaryButtonText}>Accept Match</ThemedText>
              </Pressable>
            ) : null}
            <Pressable style={styles.secondaryButton} onPress={() => router.push('/receipts/manual-match')}>
              <ThemedText style={styles.secondaryButtonText}>Match Manually</ThemedText>
            </Pressable>
            <Link href="/receipts/inbox" style={styles.tertiaryButton}>Go to Inbox</Link>
          </ThemedView>
        </>
      ) : (
        <ThemedText style={styles.cardText}>No receipt suggestion found.</ThemedText>
      )}
        <ReceiptBottomBar />
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
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.2)',
    gap: 6,
  },
  cardText: {
    opacity: 0.85,
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#0f172a',
  },
  tertiaryButton: {
    paddingVertical: 10,
    textAlign: 'center',
    borderRadius: 10,
    color: '#334155',
    overflow: 'hidden',
  },
  errorText: {
    color: '#dc2626',
  },
});
