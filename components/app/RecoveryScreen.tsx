import { useState } from 'react';

import { ActionBar, Button, Screen, Text, Toast, Wordmark } from '@/components/ds';
import { de } from '@/i18n/de';
import { useAppStore, type AppStore } from '@/store/appStore';

const t = de.recovery;

interface RecoveryScreenProps {
  /** Meldet, solange „Erneut versuchen“ oder „Zurücksetzen“ läuft. So bleibt der Hinweis stehen. */
  onBusyChange?: (busy: boolean) => void;
  store?: AppStore;
}

/**
 * Hinweis, wenn sich der gespeicherte Stand nicht laden lässt (Schritt 19). Statt auf dem
 * Splash-Screen zu hängen, bietet die App zwei Wege: noch einmal laden oder neu beginnen.
 * Der kaputte Stand ist dann schon gesichert. Zurücksetzen löscht erst nach der Sicherung.
 */
export function RecoveryScreen({ onBusyChange, store = useAppStore }: RecoveryScreenProps) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  const run = async (action: () => unknown, failed: string) => {
    setBusy(true);
    setNotice(undefined);
    onBusyChange?.(true);
    try {
      await action();
    } catch {
      // Der Stand bleibt, wie er war. Der Hinweis sagt es unten.
    }
    const loaded = store.loading.getState().status === 'ok';
    // Geladen: Die App ersetzt diesen Hinweis gleich.
    if (!loaded) {
      setNotice(failed);
      setBusy(false);
    }
    onBusyChange?.(false);
  };

  return (
    <Screen
      footer={
        <ActionBar>
          <Button
            label={t.retry}
            accessibilityHint={t.retryHint}
            size="lg"
            fullWidth
            disabled={busy}
            onPress={() => run(() => store.persist.rehydrate(), t.retryFailed)}
          />
          <Button
            label={t.reset}
            accessibilityHint={t.resetHint}
            variant="secondary"
            size="lg"
            fullWidth
            disabled={busy}
            onPress={() => run(store.resetStoredState, t.resetFailed)}
          />
        </ActionBar>
      }
    >
      <Wordmark size={26} />
      <Text variant="h1" accessibilityRole="header">
        {t.title}
      </Text>
      <Text variant="bodyLg">{t.text}</Text>
      <Text variant="body">{t.resetText}</Text>
      {notice ? <Toast message={notice} /> : null}
    </Screen>
  );
}
