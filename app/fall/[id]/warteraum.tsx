import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { ActionBar, Button, ChoiceChip, Text } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { canStartVideoCall } from '@/model/caseMachine';
import { services } from '@/services';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';

const t = de.waiting;

/** Verbindung: Wartezeit, Abbrechen, „keine Fachkraft frei“ → Rückruf (B-23) */
export default function Warteraum() {
  const theme = useTheme();
  const caseId = useCaseId();
  const { video } = useLocalSearchParams<{ video?: string }>();
  const session = useAppStore((s) => s.videoSessions.find((v) => v.id === video));
  const allowed = useAppStore((s) => {
    const c = s.cases[caseId];
    return !!c && canStartVideoCall(s.consents, c.reportedBy, caseId);
  });
  const hints = useAppStore((s) => s.demo.hints);
  const [noExpert, setNoExpert] = useState(false);
  const [slot, setSlot] = useState<string>();
  const skip = useRef<() => void>(undefined);
  const resolved = useRef(false);

  useEffect(() => {
    if (!session || !allowed) return;
    let cancelled = false;
    const skipped = new Promise<'verbunden' | 'keine_fachkraft'>((resolve) => {
      skip.current = () => resolve(useAppStore.getState().demo.videoScenario);
    });
    const scenario = useAppStore.getState().demo.videoScenario;
    Promise.race([services.video.connect(scenario), skipped]).then((outcome) => {
      if (cancelled) return;
      resolved.current = true;
      useAppStore.getState().updateVideoCall(session.id, outcome);
      if (outcome === 'verbunden') router.replace(`/fall/${caseId}/videocall?video=${session.id}`);
      else setNoExpert(true);
    });
    return () => {
      cancelled = true;
      // Wer vor dem Verbinden geht, bricht ab
      if (!resolved.current) useAppStore.getState().updateVideoCall(session.id, 'abgebrochen');
    };
    // Einmal pro Anfrage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, allowed]);

  // Ohne bestätigte Weitergabe startet kein Call
  if (!session || !allowed) return <Redirect href={`/fall/${caseId}/hilfe`} />;

  if (noExpert) {
    return (
      <CaseScreen
        title={de.screens.warteraum}
        footer={
          <ActionBar>
            <Button
              label={t.requestCallback}
              size="lg"
              fullWidth
              disabled={!slot}
              onPress={() => {
                useAppStore.getState().requestCallback(caseId, slot!);
                router.replace(`/fall/${caseId}/status`);
              }}
            />
            <Button
              label={t.onSiteInstead}
              variant="secondary"
              fullWidth
              onPress={() => router.replace(`/fall/${caseId}/termin?art=diagnose`)}
            />
          </ActionBar>
        }
      >
        <Text variant="h1" accessibilityRole="header" accessibilityLiveRegion="polite">
          {t.noExpertTitle}
        </Text>
        <Text variant="bodyLg">{t.noExpertText}</Text>
        <Text variant="meta" tone="muted">
          {t.callbackLabel}
        </Text>
        <View
          style={styles.chips}
          accessibilityRole="radiogroup"
          accessibilityLabel={t.callbackLabel}
        >
          {t.callbackSlots.map((s) => (
            <ChoiceChip key={s} label={s} selected={slot === s} onPress={() => setSlot(s)} />
          ))}
        </View>
      </CaseScreen>
    );
  }

  return (
    <CaseScreen title={de.screens.warteraum}>
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.textStrong} size="large" />
        <Text variant="h1" align="center" accessibilityRole="header">
          {t.title(demoConfig.expert.name)}
        </Text>
        <Text variant="body" align="center">
          {t.text}
        </Text>
        <Text variant="meta" align="center">
          {t.estimate}
        </Text>
      </View>
      <Button
        label={de.common.cancel}
        variant="secondary"
        fullWidth
        onPress={() => router.back()}
      />
      {demoConfig.demo.enabled && hints ? (
        <Button label={t.skip} variant="link" onPress={() => skip.current?.()} />
      ) : null}
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 14, paddingVertical: 32 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
