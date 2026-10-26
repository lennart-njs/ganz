import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Checkbox, SegmentedControl, Sheet, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import { isClosed } from '@/model/caseMachine';
import { useAppStore, type DemoSettings } from '@/store/appStore';

const t = de.demoControl;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text variant="meta" tone="muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** Demo-Steuerung: Szenarien, Selbstbeteiligung, Hinweise, Status weiter, Galerie, Zurücksetzen */
export function DemoControlSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const demo = useAppStore((s) => s.demo);
  const setDemo = useAppStore((s) => s.setDemo);
  const [message, setMessage] = useState<string>();
  const set =
    <K extends keyof DemoSettings>(key: K) =>
    (value: DemoSettings[K]) =>
      setDemo({ [key]: value });

  const advance = () => {
    const s = useAppStore.getState();
    const open = Object.values(s.cases).filter((c) => !isClosed(c.status));
    const n = open.filter((c) => s.simulateNext(c.id)).length;
    setMessage(t.advanced(n));
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t.title}>
      <Row label={t.diagnosis}>
        <SegmentedControl
          accessibilityLabel={t.diagnosis}
          options={(['standard', 'unsicher', 'unscharf'] as const).map((v) => ({
            value: v,
            label: t.diagnosisOptions[v],
          }))}
          value={demo.diagnosisScenario}
          onChange={set('diagnosisScenario')}
        />
      </Row>
      <Row label={t.scan}>
        <SegmentedControl
          accessibilityLabel={t.scan}
          options={(['erkannt', 'nicht_erkannt'] as const).map((v) => ({
            value: v,
            label: t.scanOptions[v],
          }))}
          value={demo.scanScenario}
          onChange={set('scanScenario')}
        />
      </Row>
      <Row label={t.video}>
        <SegmentedControl
          accessibilityLabel={t.video}
          options={(['verbunden', 'keine_fachkraft'] as const).map((v) => ({
            value: v,
            label: t.videoOptions[v],
          }))}
          value={demo.videoScenario}
          onChange={set('videoScenario')}
        />
      </Row>
      <Row label={t.claim}>
        <SegmentedControl
          accessibilityLabel={t.claim}
          options={(['freigeben', 'ablehnen'] as const).map((v) => ({
            value: v,
            label: t.claimOptions[v],
          }))}
          value={demo.claimScenario}
          onChange={set('claimScenario')}
        />
      </Row>
      <Row label={t.deductible}>
        <SegmentedControl
          accessibilityLabel={t.deductible}
          options={(['0', '5000'] as const).map((v) => ({
            value: v,
            label: formatEuro(Number(v)),
          }))}
          value={demo.deductible > 0 ? '5000' : '0'}
          onChange={(v) => setDemo({ deductible: Number(v) })}
        />
      </Row>
      <Checkbox
        label={t.hints}
        sub={t.hintsSub}
        checked={demo.hints}
        onChange={(v) => setDemo({ hints: v })}
      />
      <Button label={t.advance} variant="secondary" fullWidth onPress={advance} />
      {message ? (
        <Text variant="meta" accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
      <Button
        label={t.gallery}
        variant="secondary"
        fullWidth
        onPress={() => {
          onClose();
          router.push('/galerie');
        }}
      />
      <Button
        label={t.reset}
        variant="danger"
        fullWidth
        accessibilityHint={t.resetHint}
        onPress={() => {
          onClose();
          useAppStore.getState().reset();
        }}
      />
      <Button label={t.close} fullWidth onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6 },
});
