import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, SafeAreaView, StatusBar, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

const FALLBACK_API_BASE = 'http://127.0.0.1:8000';

function getApiBase() {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) {
      return `http://${host}:8000`;
    }
  }

  return FALLBACK_API_BASE;
}

const API_BASE = getApiBase();

const SCAN_STATE = {
  IDLE: 'IDLE',
  SCANNING: 'SCANNING',
  ANALYSING: 'ANALYSING',
  REPORT: 'REPORT',
};

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = permission?.granted ?? null;
  const [scanState, setScanState] = useState(SCAN_STATE.IDLE);
  const [scannedUrl, setScannedUrl] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = async ({ data }) => {
    setScanState(SCAN_STATE.ANALYSING);
    setScannedUrl(data);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: data }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = typeof json.detail === 'string' ? json.detail : 'Scan failed.';
        setError(msg);
        setScanState(SCAN_STATE.REPORT);
        return;
      }
      setReport(json);
      setScanState(SCAN_STATE.REPORT);
    } catch (e) {
      setError('Cannot reach backend. Same Wi‑Fi as PC? Backend running on ' + API_BASE + '?');
      setScanState(SCAN_STATE.REPORT);
    }
  };

  const reset = () => {
    setScanState(SCAN_STATE.IDLE);
    setScannedUrl(null);
    setReport(null);
    setError(null);
  };

  const handleUploadImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to upload a QR image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const base64 = result.assets[0].base64;
    if (!base64) {
      setError('Could not read image. Try another photo.');
      return;
    }

    setScanState(SCAN_STATE.ANALYSING);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/scan-image-base64`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64 }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setReport(null);
        setScannedUrl(null);
        setError(typeof json.detail === 'string' ? json.detail : 'Upload or decode failed.');
        setScanState(SCAN_STATE.REPORT);
        return;
      }
      setScannedUrl(json.expanded_url);
      setReport(json);
      setScanState(SCAN_STATE.REPORT);
    } catch (e) {
      setError('Cannot reach backend. Same Wi‑Fi as PC? Backend running on ' + API_BASE + '?');
      setScanState(SCAN_STATE.REPORT);
    }
  };

  const renderPermission = () => {
    if (hasPermission === null) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={styles.subtitle}>Requesting camera permission…</Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View style={styles.centered}>
          <Text style={styles.title}>Camera access needed</Text>
          <Text style={styles.subtitle}>
            SafeScan uses your camera to scan QR codes, but never opens links automatically.
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderHero = () => (
    <View style={styles.heroCard}>
      <Text style={styles.logo}>SafeScan</Text>
      <Text style={styles.heroTitle}>Proactive QR code defense</Text>
      <Text style={styles.heroBody}>
        Scan suspicious QR codes and get a full safety report before opening any site.
      </Text>
    </View>
  );

  const renderScanner = () => (
    <View style={styles.scannerContainer}>
      <View style={styles.scannerFrame}>
        <CameraView
          facing="back"
          onBarcodeScanned={scanState === SCAN_STATE.SCANNING ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.scannerOverlay} />
      </View>
      <Text style={styles.subtitle}>Align the QR code inside the frame</Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setScanState(SCAN_STATE.SCANNING)}
      >
        <Text style={styles.primaryButtonText}>
          {scanState === SCAN_STATE.SCANNING ? 'Scanning…' : 'Tap to Scan QR'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={handleUploadImage}
        disabled={scanState === SCAN_STATE.SCANNING}
      >
        <Text style={styles.uploadButtonText}>Upload QR image</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAnalysing = () => (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#22c55e" />
      <Text style={styles.title}>Auditing link…</Text>
      <Text style={styles.subtitle}>
        Expanding URL, checking reputation, and capturing a live preview.
      </Text>
    </View>
  );

  const renderReport = () => {
    const riskScore = report?.risk_score ?? null;
    const verdict = report?.verdict ?? 'Unknown';
    const expanded = report?.expanded_url ?? scannedUrl;

    const riskColor =
      riskScore == null
        ? '#6b7280'
        : riskScore < 30
        ? '#22c55e'
        : riskScore < 70
        ? '#facc15'
        : '#ef4444';

    return (
      <View style={styles.reportContainer}>
        <Text style={styles.title}>Safety report</Text>
        <Text style={styles.subtitle}>Decoded URL</Text>
        <View style={styles.urlPill}>
          <Text style={styles.urlText} numberOfLines={2}>
            {expanded}
          </Text>
        </View>

        {riskScore != null && (
          <View style={styles.riskRow}>
            <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
              <Text style={styles.riskScore}>{riskScore}</Text>
            </View>
            <View style={styles.riskCopy}>
              <Text style={styles.riskLabel}>Risk score</Text>
              <Text style={styles.riskVerdict}>{verdict}</Text>
            </View>
          </View>
        )}

        {error && (
          <Text style={[styles.subtitle, { color: '#ef4444', marginTop: 8 }]}>{error}</Text>
        )}

        {report?.screenshot_base64 && (
          <View style={styles.previewCard}>
            <Text style={styles.subtitle}>Visual preview</Text>
            <Image
              source={{ uri: `data:image/png;base64,${report.screenshot_base64}` }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={reset}>
            <Text style={styles.secondaryButtonText}>Exit safely</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => {
              // Intentional: do NOT automatically open browser for demo.
              reset();
            }}
          >
            <Text style={styles.dangerButtonText}>Proceed anyway</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.gradientBackground} />
      <View style={styles.content}>
        {renderHero()}
        {renderPermission() || (
          <>
            {scanState === SCAN_STATE.IDLE && renderScanner()}
            {scanState === SCAN_STATE.SCANNING && renderScanner()}
            {scanState === SCAN_STATE.ANALYSING && renderAnalysing()}
            {scanState === SCAN_STATE.REPORT && renderReport()}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e5e7eb',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroCard: {
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '600',
    color: '#f9fafb',
  },
  heroBody: {
    marginTop: 6,
    fontSize: 14,
    color: '#9ca3af',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 16,
  },
  scannerFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(52,211,153,0.5)',
    backgroundColor: '#020617',
  },
  scannerOverlay: {
    flex: 1,
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.8)',
    margin: 24,
    borderRadius: 18,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    minWidth: '80%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#022c22',
    fontWeight: '600',
    fontSize: 16,
  },
  uploadButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    minWidth: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
  },
  uploadButtonText: {
    color: '#e5e7eb',
    fontWeight: '500',
    fontSize: 16,
  },
  reportContainer: {
    flex: 1,
    marginTop: 16,
  },
  urlPill: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
  },
  urlText: {
    fontSize: 13,
    color: '#e5e7eb',
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  riskBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  riskScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#020617',
  },
  riskCopy: {
    marginLeft: 12,
  },
  riskLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  riskVerdict: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '600',
  },
  previewCard: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.9)',
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
  },
  previewImage: {
    marginTop: 8,
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#020617',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontWeight: '500',
  },
  dangerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#f9fafb',
    fontWeight: '600',
  },
});
