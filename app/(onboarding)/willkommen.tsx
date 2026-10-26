import { router } from 'expo-router';

import { ActionBar, Button, Disclosure, PhotoFrame, Screen, Text, Wordmark } from '@/components/ds';
import { de } from '@/i18n/de';

const t = de.onboarding;

export default function Willkommen() {
  return (
    <Screen
      footer={
        <ActionBar>
          <Button label={t.start} size="lg" fullWidth onPress={() => router.push('/schutz')} />
          <Text variant="meta" align="center">
            {t.testPhase}
          </Text>
        </ActionBar>
      }
    >
      <Wordmark size={26} />
      <PhotoFrame label={t.welcomePhoto} ratio={4 / 3} />
      <Text variant="display" accessibilityRole="header">
        {t.welcomeTitle}
      </Text>
      <Text variant="bodyLg">{t.welcomeText}</Text>
      {/* Datenschutzhinweis nach Art. 13 DSGVO, eingeklappt */}
      <Disclosure title={t.privacyTitle}>
        <Text variant="body">{t.privacyText}</Text>
        <Text variant="meta" style={{ marginTop: 8 }}>
          {t.privacyBasis}
        </Text>
      </Disclosure>
    </Screen>
  );
}
