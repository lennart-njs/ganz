import { router } from 'expo-router';

import { Button, Screen, Text, Wordmark } from '@/components/ds';
import { de } from '@/i18n/de';

export default function Index() {
  return (
    <Screen>
      <Wordmark size={26} />
      <Text variant="body">{de.app.setupHint}</Text>
      <Button
        label={de.app.openGallery}
        variant="secondary"
        onPress={() => router.push('/galerie')}
      />
    </Screen>
  );
}
