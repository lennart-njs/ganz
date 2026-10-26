import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

export interface CapturedPhoto {
  uri: string;
  source: 'in_app_camera' | 'demo';
  width?: number;
  height?: number;
}

interface CameraCaptureProps {
  onCapture: (photo: CapturedPhoto) => void;
  /** Hilfetext unter dem Bild */
  help: string;
  /** Inhalt über dem Bild, z. B. die Modus-Wahl */
  top?: ReactNode;
}

/** Kamera mit Berechtigungs-Ablauf (B-15). Ohne Kamera: Beispielfoto im Demo-Modus. */
export function CameraCapture({ onCapture, help, top }: CameraCaptureProps) {
  const theme = useTheme();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const available = Platform.OS !== 'web';

  // Nach der Rückkehr aus den Einstellungen die Berechtigung neu lesen.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') getPermission();
    });
    return () => sub.remove();
  }, [getPermission]);

  const demoPhoto = () => onCapture({ uri: '', source: 'demo' });
  const demoOption = demoConfig.demo.enabled ? (
    <Button label={de.camera.useDemoPhoto} variant="link" onPress={demoPhoto} />
  ) : null;

  const shoot = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    setFailed(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    try {
      const pic = await camera.current.takePictureAsync({ quality: 0.6 });
      onCapture({ uri: pic.uri, source: 'in_app_camera', width: pic.width, height: pic.height });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const panel = (title: string, text: string, action: ReactNode) => (
    <View style={[styles.panel, { padding: theme.gutter }]}>
      <Text variant="h1" tone="onPhoto" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="bodyLg" tone="onPhoto">
        {text}
      </Text>
      {action}
    </View>
  );

  let body: ReactNode;
  if (!available) {
    body = panel(
      de.camera.unavailableTitle,
      de.camera.unavailableText,
      <Button label={de.camera.useDemoPhoto} variant="inverse" fullWidth onPress={demoPhoto} />,
    );
  } else if (!permission) {
    body = null;
  } else if (!permission.granted && permission.canAskAgain) {
    body = panel(
      de.camera.permissionTitle,
      de.camera.permissionText,
      <>
        <Button label={de.camera.allow} variant="inverse" fullWidth onPress={requestPermission} />
        {demoOption}
      </>,
    );
  } else if (!permission.granted) {
    body = panel(
      de.camera.deniedTitle,
      de.camera.deniedText,
      <>
        <Button
          label={de.camera.openSettings}
          variant="inverse"
          fullWidth
          onPress={() => Linking.openSettings()}
        />
        {demoOption}
      </>,
    );
  } else {
    body = (
      <View style={[styles.live, { paddingHorizontal: theme.gutter }]}>
        {top}
        <View style={[styles.preview, { borderRadius: theme.radius.media }]}>
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => setReady(true)}
            accessibilityLabel={de.camera.preview}
          />
          <View
            pointerEvents="none"
            style={[
              styles.frame,
              { borderColor: theme.colors.onPhoto, borderRadius: theme.radius.media },
            ]}
          />
        </View>
        <Text variant="meta" tone="onPhoto" align="center">
          {failed ? de.camera.failed : help}
        </Text>
        <ShutterButton disabled={!ready || busy} onPress={shoot} />
      </View>
    );
  }

  return <View style={[styles.root, { backgroundColor: theme.colors.photoInk }]}>{body}</View>;
}

export function ShutterButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={de.camera.shutter}
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={[styles.shutter, { borderColor: theme.colors.onPhoto, opacity: disabled ? 0.5 : 1 }]}
    >
      <View style={[styles.shutterInner, { backgroundColor: theme.colors.onPhoto }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  panel: { flex: 1, justifyContent: 'center', gap: 16 },
  live: { flex: 1, gap: 14, paddingTop: 12, paddingBottom: 16, alignItems: 'stretch' },
  preview: { flex: 1, minHeight: 240, overflow: 'hidden' },
  frame: { position: 'absolute', left: 32, right: 32, top: 56, bottom: 56, borderWidth: 2 },
  shutter: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    padding: 4,
  },
  shutterInner: { flex: 1, borderRadius: 999 },
});
