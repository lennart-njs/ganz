import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ActionBar,
  AppHeader,
  Button,
  Card,
  CardText,
  CardTitle,
  Checkbox,
  ChoiceChip,
  ConfidenceLabel,
  Disclosure,
  FactList,
  InfoBox,
  NavRow,
  PhotoFrame,
  Screen,
  SegmentedControl,
  SelectCard,
  Sheet,
  StarRating,
  StepProgress,
  Text,
  TextField,
  Timeline,
  Toast,
  Wordmark,
} from '@/components/ds';
import { de } from '@/i18n/de';
import { ThemeProvider, useTheme, type ColorScheme } from '@/theme';

const t = de.galerie;
const s = t.sample;

type SchemeChoice = 'system' | ColorScheme;
type ScaleChoice = '1' | '2';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Preview() {
  const theme = useTheme();
  const [checked, setChecked] = useState(false);
  const [chip, setChip] = useState(0);
  const [segment, setSegment] = useState<string>(s.segments[0]);
  const [select, setSelect] = useState(0);
  const [stars, setStars] = useState(4);
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <View style={[styles.preview, { backgroundColor: theme.colors.bgPage }]}>
      <Section title={t.sections.type}>
        <Wordmark size={26} />
        <Text variant="display">{s.display}</Text>
        <Text variant="h1">{s.h1}</Text>
        <Text variant="title">{s.title}</Text>
        <Text variant="bodyLg">{s.body}</Text>
        <Text variant="meta">{s.meta}</Text>
      </Section>

      <Section title={t.sections.buttons}>
        <Button label={s.primary} size="lg" fullWidth onPress={() => setToast(s.primary)} />
        <Button
          label={s.secondary}
          variant="secondary"
          fullWidth
          onPress={() => setToast(s.secondary)}
        />
        <Button
          label={s.disabled}
          fullWidth
          disabled
          onDisabledPress={() => setToast(s.disabledHint)}
        />
        <Button label={s.link} variant="link" onPress={() => setToast(s.link)} />
        <Card tone="inverse">
          <Button
            label={s.inverse}
            variant="inverse"
            fullWidth
            onPress={() => setToast(s.inverse)}
          />
        </Card>
      </Section>

      <Section title={t.sections.forms}>
        <TextField label={s.fieldLabel} placeholder={s.fieldPlaceholder} hint={s.fieldHint} />
        <TextField label={s.fieldLabel} defaultValue="KV-0000" error={s.fieldError} />
        <TextField label={s.noteLabel} multiline rows={3} value={note} onChangeText={setNote} />
        <Checkbox label={s.checkbox} checked={checked} onChange={setChecked} />
        <View style={styles.wrap} accessibilityRole="radiogroup">
          {s.chips.map((c, i) => (
            <ChoiceChip key={c} label={c} selected={chip === i} onPress={() => setChip(i)} />
          ))}
        </View>
        <SegmentedControl
          accessibilityLabel={s.segmentsLabel}
          options={s.segments.map((x) => ({ value: x, label: x }))}
          value={segment}
          onChange={setSegment}
        />
      </Section>

      <Section title={t.sections.content}>
        <Card>
          <CardTitle>{s.cardTitle}</CardTitle>
          <CardText>{s.cardText}</CardText>
        </Card>
        <Card>
          <FactList items={s.facts} />
        </Card>
        <FactList items={s.facts} ruled dense />
        <Card>
          <Timeline items={s.timeline} />
        </Card>
        <NavRow title={s.navTitle} sub={s.navSub} onPress={() => setToast(s.navTitle)} />
        <NavRow title={s.navTitle} tone="muted" onPress={() => setToast(s.navTitle)} />
        <PhotoFrame label={s.photoLabel} />
        <InfoBox tone="achtung">{s.warning}</InfoBox>
        <InfoBox>{s.info}</InfoBox>
        <ConfidenceLabel level="hoch" />
        <ConfidenceLabel level="mittel" />
        <ConfidenceLabel level="unsicher" />
        <View accessibilityRole="radiogroup" style={styles.stack}>
          <SelectCard
            title={s.selectTitle}
            sub={s.selectSub}
            selected={select === 0}
            onPress={() => setSelect(0)}
          />
          <SelectCard
            title={s.selectTitle2}
            sub={s.selectSub2}
            selected={select === 1}
            onPress={() => setSelect(1)}
          />
        </View>
        <Disclosure title={s.disclosure}>
          <Text variant="body">{s.disclosureBody}</Text>
        </Disclosure>
      </Section>

      <Section title={t.sections.app}>
        <Card padding={0}>
          <AppHeader
            title={s.headerTitle}
            onBack={() => setToast(de.a11y.back)}
            onClose={() => setSheet(true)}
          />
        </Card>
        <StepProgress total={7} current={1} />
        <StarRating value={stars} onChange={setStars} />
        <View style={styles.bar}>
          <ActionBar meta={s.barMeta} sub={s.barSub}>
            <Button label={s.barAction} onPress={() => setToast(s.barAction)} />
          </ActionBar>
        </View>
      </Section>

      <Section title={t.sections.feedback}>
        <Button label={s.sheetOpen} variant="secondary" onPress={() => setSheet(true)} />
        <Button label={t.sample.toastShow} variant="secondary" onPress={() => setToast(s.toast)} />
        {toast ? <Toast message={toast} /> : null}
      </Section>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title={s.sheetTitle}>
        <Text variant="body">{s.sheetText}</Text>
        <Button label={s.sheetAction} fullWidth onPress={() => setSheet(false)} />
      </Sheet>
    </View>
  );
}

export default function Galerie() {
  const [scheme, setScheme] = useState<SchemeChoice>('system');
  const [scale, setScale] = useState<ScaleChoice>('1');
  return (
    <Screen header={<AppHeader title={t.title} onBack={() => router.back()} />}>
      <Text variant="body">{t.intro}</Text>
      <SegmentedControl
        accessibilityLabel={t.fontScale}
        options={[
          { value: '1', label: t.scaleOptions.normal },
          { value: '2', label: t.scaleOptions.double },
        ]}
        value={scale}
        onChange={setScale}
      />
      <SegmentedControl
        accessibilityLabel={t.scheme}
        options={[
          { value: 'system', label: t.schemeOptions.system },
          { value: 'light', label: t.schemeOptions.light },
          { value: 'dark', label: t.schemeOptions.dark },
        ]}
        value={scheme}
        onChange={setScheme}
      />
      <ThemeProvider
        scheme={scheme === 'system' ? undefined : scheme}
        previewFontScale={scale === '2' ? 2 : undefined}
      >
        <Preview />
      </ThemeProvider>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { gap: 32, marginHorizontal: -20, paddingHorizontal: 20, paddingVertical: 16 },
  section: { gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stack: { gap: 10 },
  bar: { marginHorizontal: -20 },
});
