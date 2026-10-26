import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, NavRow, Screen, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { formatDateTime } from '@/i18n/format';
import { caseStatusLabel, resumeHref } from '@/lib/caseView';
import { deviceTitle } from '@/lib/devices';
import { isClosed } from '@/model/caseMachine';
import type { Case } from '@/model/types';
import { useAppStore } from '@/store/appStore';

const t = de.cases;

/** Alle Fälle aus dem Store, offene oben (B-36) */
export default function Faelle() {
  const state = useAppStore();
  const all = Object.values(state.cases).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const open = all.filter((c) => !isClosed(c.status));
  const closed = all.filter((c) => isClosed(c.status));
  const firstDevice = state.devices[0];

  const row = (c: Case) => {
    const device = state.devices.find((d) => d.id === c.deviceId);
    return (
      <NavRow
        key={c.id}
        title={c.problemLabel}
        sub={t.rowSub(
          device ? deviceTitle(device) : '',
          caseStatusLabel(c.status),
          formatDateTime(c.updatedAt),
        )}
        onPress={() => {
          if (isClosed(c.status)) router.push(`/fall/${c.id}/fallakte`);
          else {
            if (c.pausedAt) state.resumeCase(c.id);
            router.push(resumeHref(state, c));
          }
        }}
      />
    );
  };

  return (
    <Screen>
      <Text variant="h1" accessibilityRole="header">
        {de.screens.faelle}
      </Text>
      {all.length === 0 ? (
        <Card>
          <Text variant="title">{t.emptyTitle}</Text>
          <Text variant="body" style={styles.gap}>
            {t.emptyText}
          </Text>
          <Button
            label={t.report}
            variant="secondary"
            style={styles.gap}
            onPress={() =>
              router.push(firstDevice ? `/fall/neu?geraet=${firstDevice.id}` : '/geraet/neu')
            }
          />
        </Card>
      ) : null}
      {open.length ? (
        <View style={styles.section}>
          <Text variant="title" accessibilityRole="header">
            {t.open}
          </Text>
          {open.map(row)}
        </View>
      ) : null}
      {closed.length ? (
        <View style={styles.section}>
          <Text variant="title" accessibilityRole="header">
            {t.closed}
          </Text>
          {closed.map(row)}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  gap: { marginTop: 12 },
});
