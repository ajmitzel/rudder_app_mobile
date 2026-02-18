import { Image, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiFetch } from '@/services/api';
import { formatAmount } from '@/services/format';
import { ReceiptBottomBar } from '@/components/receipt-bottom-bar';

type Expense = {
  id: string;
  expense_date?: string | null;
  amount?: number | null;
  vendor?: string | null;
  category_id?: string | null;
  job_id?: string | null;
};

export default function ReceiptManualMatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ suggestionId?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptThumbUrl, setReceiptThumbUrl] = useState<string | null>(null);

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

  useEffect(() => {
    const loadExpenses = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch('/receipts/inbox');
        if (!res.ok) {
          throw new Error(`Inbox request failed (${res.status})`);
        }
        const data = await res.json();
        setExpenses((data?.expenses ?? []) as Expense[]);
        const suggestions = (data?.suggestions ?? []) as { id: string; receipt_file_url?: string | null }[];
        if (params.suggestionId) {
          const match = suggestions.find((s) => s.id === params.suggestionId);
          const rawUrl = match?.receipt_file_url ?? null;
          setReceiptThumbUrl(toAbsoluteReceiptUrl(rawUrl));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load expenses.');
      } finally {
        setLoading(false);
      }
    };
    loadExpenses();
  }, []);

  const handleConfirm = async () => {
    if (!params.suggestionId || !selectedId) {
      setError('Select an expense to match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/receipts/suggestions/${params.suggestionId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expense_id: selectedId }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Match failed');
      }
      Toast.show({
        type: 'success',
        text1: 'Receipt matched',
        position: 'bottom',
      });
      router.replace('/receipts/inbox');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to match receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Manual Match</ThemedText>
        <ThemedView style={styles.headerRow}>
          {receiptThumbUrl ? (
            <Image source={{ uri: receiptThumbUrl }} style={styles.thumb} />
          ) : (
            <ThemedView style={styles.thumbPlaceholder}>
              <ThemedText style={styles.thumbPlaceholderText}>No preview</ThemedText>
            </ThemedView>
          )}
          <ThemedText style={styles.subtitle}>
            Pick an existing expense to attach this receipt.
          </ThemedText>
        </ThemedView>

      {loading ? (
        <ThemedText style={styles.rowMeta}>Loading expenses…</ThemedText>
      ) : error ? (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {expenses.length === 0 ? (
            <ThemedText style={styles.rowMeta}>No eligible expenses found.</ThemedText>
          ) : (
            expenses.map((expense) => (
              <Pressable
                key={expense.id}
                onPress={() => setSelectedId(expense.id)}
                style={[
                  styles.row,
                  selectedId === expense.id && styles.rowSelected,
                ]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={selectedId === expense.id ? styles.rowTextSelected : undefined}
                >
                  {expense.vendor || 'Unknown vendor'}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.rowMeta,
                    selectedId === expense.id && styles.rowMetaSelected,
                  ]}
                >
                  {formatAmount(expense.amount)} · {expense.expense_date || 'Unknown date'}
                </ThemedText>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      <ThemedView style={styles.actions}>
        <Pressable
          style={[styles.primaryButton, (!selectedId || submitting) && styles.primaryButtonDisabled]}
          onPress={handleConfirm}
          disabled={!selectedId || submitting}
        >
          <ThemedText style={styles.primaryButtonText}>
            {submitting ? 'Matching…' : 'Confirm Match'}
          </ThemedText>
        </Pressable>
        <Link href="/receipts/inbox" style={styles.secondaryButton}>Cancel</Link>
      </ThemedView>
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
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: {
    fontSize: 10,
    opacity: 0.6,
  },
  list: {
    gap: 12,
  },
  row: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.2)',
    gap: 4,
  },
  rowSelected: {
    borderColor: '#0f172a',
    backgroundColor: '#ffffff',
  },
  rowTextSelected: {
    color: '#0f172a',
  },
  rowMeta: {
    opacity: 0.7,
  },
  rowMetaSelected: {
    color: '#0f172a',
    opacity: 0.7,
  },
  errorText: {
    color: '#dc2626',
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    marginTop: 6,
    paddingVertical: 12,
    textAlign: 'center',
    borderRadius: 10,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
    textAlign: 'center',
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
    overflow: 'hidden',
  },
});
