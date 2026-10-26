import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';

import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { ActionBar, Button, Icon, Text } from '@/components/ds';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import { caseCategory } from '@/lib/appliance';
import { isPhotoMode, toDiagnosis } from '@/lib/diagnosis';
import { services } from '@/services';
import { delay } from '@/services/mock/timing';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';

/** Fortschritt in Schritten mit Ansage für den Screenreader (B-14). Abbrechen = zurück zur Kamera. */
export default function Analyse() {
  const theme = useTheme();
  const caseId = useCaseId();
  const params = useLocalSearchParams<{ foto?: string; modus?: string }>();
  const mode = isPhotoMode(params.modus) ? params.modus : 'display';
  const photo = useAppStore((s) => s.photos.find((p) => p.id === params.foto));
  const lines = de.analysis.lines[mode];
  const [done, setDone] = useState(0);
  const [blurry, setBlurry] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!useAppStore.getState().cases[caseId]) return;
    (async () => {
      for (let i = 0; i < lines.length; i++) {
        await delay(650);
        if (cancelled) return;
        setDone(i + 1);
        AccessibilityInfo.announceForAccessibility(de.analysis.lineDone(lines[i]!));
      }
      const scenario = useAppStore.getState().demo.diagnosisScenario;
      const category = caseCategory(useAppStore.getState(), caseId);
      const result = await services.diagnosis.analyze({ mode, scenario, category });
      if (cancelled || !useAppStore.getState().cases[caseId]) return;
      const s = useAppStore.getState();
      const photoIds = params.foto ? [params.foto] : [];
      switch (result.kind) {
        case 'fehler':
          setBlurry(true);
          AccessibilityInfo.announceForAccessibility(de.analysis.blurryTitle);
          return;
        case 'rueckfrage':
          router.replace(`/fall/${caseId}/rueckfrage?foto=${params.foto ?? ''}&modus=${mode}`);
          return;
        case 'geraet':
          s.addDiagnosis({
            caseId,
            photoIds,
            mode: 'typenschild',
            errorPattern: 'geraet_erkannt',
            confidence: 'hoch',
            confidenceScore: 0.95,
            source: 'fehlererkennung',
          });
          router.replace(`/fall/${caseId}/ergebnis`);
          return;
        case 'ohne_anleitung':
          s.addDiagnosis({
            caseId,
            photoIds,
            mode,
            errorPattern: 'ohne_anleitung',
            confidence: 'unsicher',
            confidenceScore: 0,
            source: 'fehlererkennung',
          });
          router.replace(`/fall/${caseId}/ergebnis`);
          return;
        case 'ergebnis':
          s.updateCase(caseId, { problemLabel: guides[result.guideId as GuideId].title });
          s.addDiagnosis(toDiagnosis(caseId, photoIds, mode, result));
          router.replace(`/fall/${caseId}/ergebnis`);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Einmal pro Foto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.foto]);

  return (
    <CaseScreen
      title={de.screens.analyse}
      footer={
        blurry ? (
          <ActionBar>
            <Button
              label={de.analysis.newPhoto}
              size="lg"
              fullWidth
              onPress={() => router.back()}
            />
          </ActionBar>
        ) : undefined
      }
    >
      <View
        style={[
          styles.photo,
          { borderRadius: theme.radius.media, backgroundColor: theme.colors.photoInk },
        ]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={de.analysis.photo}
      >
        {photo?.uri ? (
          <Image source={{ uri: photo.uri }} style={[StyleSheet.absoluteFill, styles.dim]} />
        ) : null}
      </View>
      {blurry ? (
        <View accessibilityLiveRegion="assertive" style={styles.lines}>
          <Text variant="h1" accessibilityRole="header">
            {de.analysis.blurryTitle}
          </Text>
          <Text variant="bodyLg">{de.analysis.blurryText}</Text>
        </View>
      ) : (
        <>
          <Text variant="h1" accessibilityRole="header">
            {de.analysis.title}
          </Text>
          <View style={styles.lines} accessibilityLiveRegion="polite">
            {lines.map((line, i) => (
              <View
                key={line}
                style={styles.line}
                accessible
                accessibilityLabel={i < done ? de.analysis.lineDone(line) : line}
              >
                {i < done ? (
                  <Icon name="check" size={18} strokeWidth={2.6} />
                ) : (
                  <View style={[styles.pending, { borderColor: theme.colors.borderControl }]} />
                )}
                <Text variant="body" tone={i < done ? 'strong' : 'muted'}>
                  {line}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 16 / 10, overflow: 'hidden' },
  dim: { opacity: 0.55 },
  lines: { gap: 14 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pending: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
});
