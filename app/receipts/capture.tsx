import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ReceiptBottomBar } from '@/components/receipt-bottom-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  enqueueReceiptUpload,
  listQueuedReceipts,
  processReceiptUploadQueue,
} from '@/services/receipts';
import { analyzeFrameBase64 } from '@/services/camera_quality';

export default function ReceiptCaptureScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [frameHeight, setFrameHeight] = useState(360);
  const CAMERA_ASPECT = 3 / 4; // portrait: width/height
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [qualityHint, setQualityHint] = useState<string>('Ready to capture.');
  const [capturing, setCapturing] = useState(false);
  const analyzingRef = useRef(false);
  const captureInFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    const loadQueue = async () => {
      const queue = await listQueuedReceipts();
      const pending = queue.filter((q) => q.status !== 'uploaded');
      setPendingCount(pending.length);
    };
    loadQueue();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !permission?.granted || !cameraReady || previewUri || uploading || capturing) {
      return;
    }
    const timer = setInterval(async () => {
      if (!cameraRef.current || analyzingRef.current || capturing || captureInFlightRef.current) {
        return;
      }
      analyzingRef.current = true;
      try {
        const frame = await cameraRef.current.takePictureAsync({
          quality: 0.1,
          skipProcessing: true,
          base64: true,
        });
        if (!frame?.base64) {
          return;
        }
        const { brightness, blurScore, edgeDensity } = analyzeFrameBase64(frame.base64);
        if (brightness < 70) {
          setQualityHint('Too dark');
        } else if (brightness > 200) {
          setQualityHint('Too bright');
        } else if (edgeDensity < 0.06) {
          setQualityHint('Align receipt in frame');
        } else if (blurScore < 120) {
          setQualityHint('Hold steady');
        } else {
          setQualityHint('Ready to capture.');
        }
      } catch {
        // ignore frame errors
      } finally {
        analyzingRef.current = false;
      }
    }, 700);
    return () => clearInterval(timer);
  }, [permission?.granted, cameraReady, previewUri, uploading, capturing]);

  const handleCapture = async () => {
    setStatus(null);
    if (capturing || captureInFlightRef.current) {
      return;
    }
    if (Platform.OS === 'web') {
      setStatus('Camera preview is not supported on web yet.');
      return;
    }
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        setStatus('Camera permission denied.');
        return;
      }
    }
    if (!cameraRef.current) {
      setStatus('Camera not ready.');
      return;
    }
    if (analyzingRef.current) {
      setStatus('Camera is still focusing. Try again.');
      return;
    }

    captureInFlightRef.current = true;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (photo?.uri && mountedRef.current) {
        setPreviewUri(photo.uri);
      }
    } catch (err) {
      if (!mountedRef.current) {
        return;
      }
      const msg = err instanceof Error ? err.message : 'Capture failed. Please try again.';
      if (msg.toLowerCase().includes('camera unmounted')) {
        setStatus('Camera reset while capturing. Please try again.');
      } else {
        setStatus(msg);
      }
    } finally {
      captureInFlightRef.current = false;
      if (mountedRef.current) {
        setCapturing(false);
      }
    }
  };

  const handleRetake = () => {
    setPreviewUri(null);
    setStatus(null);
  };

  const handleUsePhoto = async () => {
    if (!previewUri) {
      return;
    }
    setUploading(true);
    try {
      await enqueueReceiptUpload(previewUri, 'receipt.jpg', 'image/jpeg');
      setStatus('Receipt saved and queued for upload.');
      Toast.show({
        type: 'info',
        text1: 'Receipt saved',
        text2: 'Uploading in the background',
        position: 'bottom',
      });
      // Kick background processing but don't wait for it.
      processReceiptUploadQueue().catch(() => {});
      router.replace('/receipts/inbox');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Capture queue failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ThemedView style={styles.container}>
      <ThemedText type="title">Capture Receipt</ThemedText>
      <ThemedText style={styles.subtitle}>
        Snap the receipt. We’ll upload when you’re online.
      </ThemedText>

      <View style={styles.cameraCard}>
        <View
          style={[styles.cameraFrame, { height: frameHeight }]}
          collapsable={false}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            if (width > 0) {
              setFrameHeight(width / CAMERA_ASPECT);
            }
          }}
        >
          <View style={[styles.cameraFill, { height: frameHeight }]} collapsable={false}>
            {Platform.OS === 'web' ? (
              <View style={styles.cameraGuide}>
                <ThemedText style={styles.placeholderText}>
                  Camera preview is not available on web.
                </ThemedText>
              </View>
            ) : previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.cameraPreview} resizeMode="cover" />
            ) : permission?.granted ? (
              <>
                <CameraView
                  ref={cameraRef}
                  style={styles.cameraPreview}
                  facing="back"
                  ratio={Platform.OS === 'android' ? '4:3' : undefined}
                  onCameraReady={() => setCameraReady(true)}
                />
                <View style={styles.cornerGuide} pointerEvents="none">
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>
                {!cameraReady ? (
                  <View style={styles.cameraReadyOverlay} pointerEvents="none">
                    <ThemedText style={styles.placeholderText}>Starting camera…</ThemedText>
                  </View>
                ) : null}
                <View style={styles.qualityOverlay} pointerEvents="none">
                  <ThemedText style={styles.qualityOverlayText}>
                    {status ?? (uploading ? 'Uploading…' : qualityHint)}
                  </ThemedText>
                </View>
              </>
            ) : (
              <View style={styles.cameraGuide}>
                <ThemedText style={styles.placeholderText}>
                  Camera access is required to capture receipts.
                </ThemedText>
                <Pressable style={styles.permissionButton} onPress={requestPermission}>
                  <ThemedText style={styles.permissionText}>Enable Camera</ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      {pendingCount > 0 ? (
        <ThemedText style={styles.queueText}>
          {pendingCount} pending upload{pendingCount === 1 ? '' : 's'}
        </ThemedText>
      ) : null}

      <ThemedView style={styles.actions}>
        {previewUri ? (
          <>
            <Pressable style={styles.primaryButton} onPress={handleUsePhoto} disabled={uploading || capturing}>
              <ThemedText style={styles.primaryButtonText}>
                {uploading ? 'Saving…' : 'Use Photo'}
              </ThemedText>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleRetake} disabled={uploading || capturing}>
              <ThemedText style={styles.secondaryButtonText}>Retake</ThemedText>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.primaryButton} onPress={handleCapture} disabled={uploading || capturing}>
            <ThemedText style={styles.primaryButtonText}>
              {capturing ? 'Capturing…' : uploading ? 'Uploading…' : 'Capture'}
            </ThemedText>
          </Pressable>
        )}
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
    paddingTop: 8,
    gap: 16,
    paddingBottom: 170,
  },
  subtitle: {
    opacity: 0.8,
  },
  cameraCard: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.12)',
    backgroundColor: '#f8fafc',
    marginBottom: 72,
    alignItems: 'stretch',
  },
  cameraFrame: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.15)',
    backgroundColor: '#000000',
    overflow: 'hidden',
    position: 'relative',
  },
  cameraFill: {
    flex: 1,
    width: '100%',
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 1.08 }],
  },
  cameraGuide: {
    width: '86%',
    height: '82%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  cornerGuide: {
    position: 'absolute',
    width: '86%',
    height: '82%',
    alignSelf: 'center',
    top: '9%',
    zIndex: 2,
  },
  cameraReadyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  qualityOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.65)',
    alignItems: 'center',
    zIndex: 4,
  },
  qualityOverlayText: {
    color: '#ffffff',
    fontSize: 12,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: 'rgba(15,23,42,0.35)',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderLeftWidth: 3,
    borderTopWidth: 3,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderRightWidth: 3,
    borderTopWidth: 3,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  permissionButton: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#0f172a',
  },
  permissionText: {
    color: '#ffffff',
    fontSize: 12,
  },
  placeholderText: {
    opacity: 0.7,
  },
  queueText: {
    fontSize: 12,
    opacity: 0.7,
  },
  actions: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 85,
  },
  primaryButton: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
  },
});
