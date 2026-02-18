import { StyleSheet, Pressable, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ReceiptBottomBarProps = {
  queuedCount?: number;
  suggestedCount?: number;
  unmatchedCount?: number;
};

export function ReceiptBottomBar({
  queuedCount,
  suggestedCount,
  unmatchedCount,
}: ReceiptBottomBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];

  const isHome = pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
  const isInbox = pathname.includes('/receipts/inbox');
  const isCapture = pathname.includes('/receipts/capture');

  const hasCounts =
    typeof queuedCount === 'number' ||
    typeof suggestedCount === 'number' ||
    typeof unmatchedCount === 'number';

  return (
    <ThemedView style={[styles.wrapper, { backgroundColor: palette.background, borderColor: palette.icon }]}>
      {hasCounts ? (
        <View style={styles.countRow}>
          {typeof queuedCount === 'number' ? (
            <ThemedText style={styles.countText}>Queued: {queuedCount}</ThemedText>
          ) : null}
          {typeof suggestedCount === 'number' ? (
            <ThemedText style={styles.countText}>Suggested: {suggestedCount}</ThemedText>
          ) : null}
          {typeof unmatchedCount === 'number' ? (
            <ThemedText style={styles.countText}>Unmatched: {unmatchedCount}</ThemedText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.navRow}>
        <Pressable
          style={styles.navButton}
          onPress={() => router.replace('/')}
        >
          <IconSymbol
            size={22}
            name="house.fill"
            color={isHome ? palette.tabIconSelected : palette.tabIconDefault}
          />
          <ThemedText
            style={[
              styles.navText,
              { color: isHome ? palette.tabIconSelected : palette.tabIconDefault },
            ]}
          >
            Home
          </ThemedText>
        </Pressable>
        <Pressable
          style={styles.navButton}
          onPress={() => router.replace('/receipts/inbox')}
        >
          <IconSymbol
            size={22}
            name="tray.full.fill"
            color={isInbox ? palette.tabIconSelected : palette.tabIconDefault}
          />
          <ThemedText
            style={[
              styles.navText,
              { color: isInbox ? palette.tabIconSelected : palette.tabIconDefault },
            ]}
          >
            Inbox
          </ThemedText>
        </Pressable>
        <Pressable
          style={styles.navButton}
          onPress={() => router.replace('/receipts/capture')}
        >
          <IconSymbol
            size={22}
            name="camera.fill"
            color={isCapture ? palette.tabIconSelected : palette.tabIconDefault}
          />
          <ThemedText
            style={[
              styles.navText,
              { color: isCapture ? palette.tabIconSelected : palette.tabIconDefault },
            ]}
          >
            Capture
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingBottom: 6,
    paddingTop: 6,
  },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  countText: {
    fontSize: 12,
    opacity: 0.7,
  },
  navRow: {
    flexDirection: 'row',
    paddingHorizontal: 6,
  },
  navButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 12,
  },
});
