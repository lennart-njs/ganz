import { useState } from 'react';

import {
  ActionBar,
  AppHeader,
  Button,
  Screen,
  SegmentedControl,
  Text,
  TextField,
} from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { services, type LinkVia } from '@/services';
import { useAppStore } from '@/store/appStore';

const t = de.onboarding;

/** Schutz verknüpfen: Vertragsnummer oder Händler-Code. „Später“ ist möglich. */
interface LinkContractFormProps {
  onBack: () => void;
  onLinked: () => void;
  onSkip?: () => void;
}

export function LinkContractForm({ onBack, onLinked, onSkip }: LinkContractFormProps) {
  const linkContract = useAppStore((s) => s.linkContract);
  const [via, setVia] = useState<LinkVia>('vertragsnummer');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!value.trim()) {
      setError(t.empty);
      return;
    }
    setChecking(true);
    setError(undefined);
    const result = await services.contract.link(via, value);
    setChecking(false);
    if (!result.ok) {
      setError(t.unknown[via]);
      return;
    }
    linkContract(via);
    onLinked();
  };

  const example = via === 'vertragsnummer' ? demoConfig.contract.number : demoConfig.dealer.code;

  return (
    <Screen
      header={<AppHeader title={de.screens.schutz} onBack={onBack} />}
      footer={
        <ActionBar>
          <Button
            label={checking ? t.checking : t.link}
            size="lg"
            fullWidth
            disabled={checking}
            onPress={submit}
          />
          {onSkip ? (
            <Button label={de.common.later} variant="secondary" fullWidth onPress={onSkip} />
          ) : null}
        </ActionBar>
      }
    >
      <Text variant="h1" accessibilityRole="header">
        {t.linkTitle}
      </Text>
      <Text variant="body">{t.linkText}</Text>
      <SegmentedControl
        accessibilityLabel={t.viaLabel}
        options={[
          { value: 'vertragsnummer', label: t.via.vertragsnummer },
          { value: 'haendler_code', label: t.via.haendler_code },
        ]}
        value={via}
        onChange={(v) => {
          setVia(v);
          setError(undefined);
        }}
      />
      <TextField
        label={t.via[via]}
        placeholder={de.common.example(example)}
        hint={t.hint[via]}
        error={error}
        value={value}
        onChangeText={(v) => {
          setValue(v);
          setError(undefined);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {onSkip ? <Text variant="meta">{t.laterHint}</Text> : null}
    </Screen>
  );
}
