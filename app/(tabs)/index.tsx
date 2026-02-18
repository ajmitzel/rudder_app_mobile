import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Daily Workflow</ThemedText>
        <ThemedText style={styles.subtitle}>
          Capture receipts in the field and match them to expenses fast.
        </ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Capture a Receipt</ThemedText>
          <ThemedText style={styles.cardText}>
            Take a photo and upload it right away. Works offline and syncs later.
          </ThemedText>
          <Link href="/receipts/capture" style={styles.primaryButton}>
            Capture Receipt
          </Link>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Inbox</ThemedText>
          <ThemedText style={styles.cardText}>
            Review unmatched receipts and accept suggested matches.
          </ThemedText>
          <Link href="/receipts/inbox" style={styles.secondaryButton}>
            Open Inbox
          </Link>
        </ThemedView>
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
  },
  subtitle: {
    opacity: 0.8,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.2)',
  },
  cardText: {
    opacity: 0.8,
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
