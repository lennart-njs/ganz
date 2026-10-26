import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { ActionBar, Button, PhotoFrame, StarRating, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { activeBooking, useAppStore } from '@/store/appStore';

const t = de.finish;

/** Abschluss: Abschlussfoto, „Läuft wieder“ oder „Problem besteht weiter“, Bewertung (B-35). */
export default function Abschluss() {
  const caseId = useCaseId();
  const state = useAppStore();
  const c = state.cases[caseId];
  const booking = activeBooking(state, caseId);
  const [stars, setStars] = useState(booking?.rating?.stars ?? 0);

  if (!c) return <Redirect href="/(tabs)" />;

  const repaired = booking?.kind === 'reparatur' && booking.status === 'erledigt';
  const awaitingConfirm = repaired && c.status === 'in_reparatur';
  const done = c.status === 'erledigt';

  // Noch nicht so weit: zurück zum Status
  if (!done && !awaitingConfirm) return <Redirect href={`/fall/${caseId}/status`} />;

  const finish = () => router.dismissTo('/(tabs)/faelle');
  const stillBroken = () => {
    useAppStore.getState().confirmRepair(caseId, false);
    router.replace(`/fall/${caseId}/hilfe`);
  };

  const footer = awaitingConfirm ? (
    <ActionBar>
      <Button
        label={t.runsAgain}
        size="lg"
        fullWidth
        onPress={() => useAppStore.getState().confirmRepair(caseId, true)}
      />
      <Button label={t.stillBroken} variant="secondary" fullWidth onPress={stillBroken} />
    </ActionBar>
  ) : (
    <ActionBar>
      <Button label={t.done} size="lg" fullWidth onPress={finish} />
      <Button label={t.stillBroken} variant="secondary" fullWidth onPress={stillBroken} />
    </ActionBar>
  );

  const title = repaired ? t.repairedTitle : t.solvedTitle;
  const text = repaired
    ? t.repairedText(booking!.provider.name)
    : c.resolution === 'im_call_geloest'
      ? t.solvedCallText
      : t.solvedText;

  return (
    <CaseScreen title={de.screens.abschluss} footer={footer}>
      <PhotoFrame label={repaired ? t.photo : t.photoSelf} ratio={4 / 3} />
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="bodyLg">{text}</Text>
      {awaitingConfirm ? (
        <Text variant="title" accessibilityRole="header">
          {t.question}
        </Text>
      ) : null}
      {repaired && done && booking ? (
        <View style={styles.rating}>
          <Text variant="title" accessibilityRole="header">
            {t.rate}
          </Text>
          <StarRating
            value={stars}
            onChange={(n) => {
              setStars(n);
              useAppStore.getState().rateBooking(booking.id, n as 1 | 2 | 3 | 4 | 5);
            }}
          />
          {stars ? <Text variant="meta">{t.thanks}</Text> : null}
        </View>
      ) : null}
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  rating: { gap: 8 },
});
