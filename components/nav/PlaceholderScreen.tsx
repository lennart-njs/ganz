import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionBar, AppHeader, Button, NavRow, Screen, Text } from '@/components/ds';
import { de } from '@/i18n/de';

import { CloseCaseSheet } from './CloseCaseSheet';

export interface PlaceholderAction {
  label: string;
  onPress: () => void;
}

interface PlaceholderScreenProps {
  title: string;
  /** Schritt aus BUILD_PLAN Abschnitt 5, in dem der Screen gebaut wird */
  step: number;
  /** Wege zu anderen Screens */
  actions?: PlaceholderAction[];
  /** Hauptaktion in der Aktionsleiste */
  primary?: PlaceholderAction;
  /** Zurück-Button. Standard: router.back(), wie Wischgeste und Android-Zurück. */
  back?: boolean;
  /** Im Fall: X öffnet das Schließen-Sheet */
  caseId?: string;
  inCase?: boolean;
  /** In Tabs setzt die Tab-Navigation keinen oberen Abstand */
  safeTop?: boolean;
}

/** Gerüst für Screens, die erst in einem späteren Schritt Inhalt bekommen. */
export function PlaceholderScreen({
  title,
  step,
  actions = [],
  primary,
  back = true,
  caseId,
  inCase,
  safeTop,
}: PlaceholderScreenProps) {
  const [closing, setClosing] = useState(false);
  return (
    <Screen
      safeTop={safeTop}
      header={
        <AppHeader
          title={title}
          onBack={back ? () => router.back() : undefined}
          onClose={inCase ? () => setClosing(true) : undefined}
        />
      }
      footer={
        primary ? (
          <ActionBar>
            <Button label={primary.label} size="lg" fullWidth onPress={primary.onPress} />
          </ActionBar>
        ) : undefined
      }
    >
      <Text variant="meta">{de.nav.placeholder(step)}</Text>
      <View style={styles.list}>
        {actions.map((a) => (
          <NavRow key={a.label} title={a.label} onPress={a.onPress} />
        ))}
      </View>
      {inCase ? (
        <CloseCaseSheet caseId={caseId} visible={closing} onClose={() => setClosing(false)} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
});
