import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DemoHint } from '@/components/app/DemoHint';
import { AppHeader, Button, Icon, NavRow, Screen, Sheet, Text, TextField } from '@/components/ds';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import { appliance, hasGuides } from '@/lib/appliance';
import { deviceTitle } from '@/lib/devices';
import type { CaseEntry, Id } from '@/model/types';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';

const t = de.problem;

/** Problem melden: Foto, Meldung im Display, Symptom oder „Etwas anderes“ (B-54). Kein Link nach außen. */
export default function ProblemMelden() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ geraet?: string; fall?: string }>();
  const store = useAppStore;
  const devices = useAppStore((s) => s.devices);
  const resumed = useAppStore((s) => (params.fall ? s.cases[params.fall] : undefined));
  const device = devices.find((d) => d.id === (params.geraet ?? resumed?.deviceId)) ?? devices[0];
  const draft = useRef<Id | undefined>(resumed?.id);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [otherError, setOtherError] = useState<string>();

  // Ein Fall ohne Inhalt bleibt nicht liegen, wenn man „Problem melden“ verlässt.
  useEffect(() => {
    return () => {
      if (draft.current) store.getState().discardIfEmpty(draft.current);
    };
  }, [store]);

  /** Legt den Fall an oder nutzt den leeren Entwurf weiter */
  const caseFor = (entry: CaseEntry, problemLabel: string): Id => {
    const s = store.getState();
    const existing = draft.current ? s.cases[draft.current] : undefined;
    if (existing && existing.status === 'offen') {
      s.updateCase(existing.id, { entry, problemLabel });
      return existing.id;
    }
    const c = s.createCase({ deviceId: device!.id, entry, problemLabel });
    draft.current = c.id;
    return c.id;
  };

  const photo = () => {
    const id = caseFor('foto', t.photoLabel);
    router.push(`/fall/${id}/kamera`);
  };

  const pick = (problemId: string, label: string) => {
    // Ohne Anleitung (alle Geräte außer der Waschmaschine): gleich Hilfe holen
    if (!hasGuides(device?.category)) {
      const id = caseFor('symptom', label);
      store.getState().escalate(id);
      router.push(`/fall/${id}/hilfe`);
      return;
    }
    if (problemId === 'meldung') {
      const id = caseFor('meldung', label);
      router.push(`/fall/${id}/meldungen`);
      return;
    }
    const guide = guides[problemId as GuideId];
    const id = caseFor('symptom', guide.title);
    store.getState().startGuide(id, guide.id);
    router.push(`/fall/${id}/anleitung`);
  };

  const submitOther = () => {
    const text = otherText.trim();
    if (text.length < 3) {
      setOtherError(t.otherTooShort);
      return;
    }
    const id = caseFor('freitext', text.length > 60 ? `${text.slice(0, 57)}…` : text);
    const s = store.getState();
    s.addEvent({
      caseId: id,
      type: 'rueckfrage_beantwortet',
      actor: { kind: 'haushalt', id: s.persons[0]?.id },
      payload: { question: t.otherTitle, answer: text },
    });
    s.escalate(id);
    setOtherOpen(false);
    router.push(`/fall/${id}/hilfe`);
  };

  const header = <AppHeader title={de.screens.problem} onBack={() => router.back()} />;

  if (!device) {
    return (
      <Screen header={header}>
        <Text variant="body">{t.noDevice}</Text>
        <Button label={de.home.addDevice} onPress={() => router.replace('/geraet/neu')} />
      </Screen>
    );
  }

  const a = appliance(device.category);
  const entries = hasGuides(device.category) ? de.problems : a.symptoms;

  return (
    <Screen header={header}>
      {hasGuides(device.category) ? <DemoHint id="problem" /> : null}
      <Text variant="meta">{t.forDevice(deviceTitle(device))}</Text>
      <Text variant="h1" accessibilityRole="header">
        {t.title}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={de.a11y.withSub(t.photo, t.photoSub)}
        onPress={photo}
        style={({ pressed }) => [
          styles.photo,
          {
            borderRadius: theme.radius.media,
            backgroundColor: pressed
              ? theme.colors.actionPrimaryPressed
              : theme.colors.surfaceInverse,
          },
        ]}
      >
        <Icon name="camera" size={30} color="textOnInverse" strokeWidth={1.6} />
        <View style={styles.photoText}>
          <Text variant="title" tone="onInverse">
            {t.photo}
          </Text>
          <Text variant="meta" tone="onInverseMuted">
            {t.photoSub}
          </Text>
        </View>
      </Pressable>

      <Text variant="body" tone="muted" style={styles.describe}>
        {t.describe}
      </Text>
      <View style={styles.list}>
        {entries.map((p) => (
          <NavRow key={p.id} title={p.label} sub={p.sub} onPress={() => pick(p.id, p.label)} />
        ))}
        <NavRow title={t.other} sub={t.otherSub} onPress={() => setOtherOpen(true)} />
      </View>

      <Sheet visible={otherOpen} onClose={() => setOtherOpen(false)} title={t.otherTitle}>
        <TextField
          label={t.otherLabel}
          placeholder={a.otherPlaceholder}
          hint={t.otherHint}
          error={otherError}
          multiline
          rows={3}
          value={otherText}
          onChangeText={(v) => {
            setOtherText(v);
            setOtherError(undefined);
          }}
        />
        <Button label={t.getHelp} size="lg" fullWidth onPress={submitOther} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    minHeight: 96,
  },
  photoText: { flex: 1, gap: 2 },
  describe: { marginTop: 12 },
  list: { gap: 8 },
});
