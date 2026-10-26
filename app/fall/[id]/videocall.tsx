import { Redirect, router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoundButton } from '@/components/app/RoundButton';
import { Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { guideSummary } from '@/lib/caseView';
import { canStartVideoCall } from '@/model/caseMachine';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';

const t = de.call;

function mmss(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Videocall (simuliert): Fachkraft, eigenes Bild, Untertitel, Mikrofon, Kamera, Auflegen. Keine Aufnahme (B-25). */
export default function Videocall() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id: caseId, video } = useLocalSearchParams<{ id: string; video?: string }>();
  const state = useAppStore();
  const c = state.cases[caseId];
  const session = state.videoSessions.find((v) => v.id === video);
  const allowed = !!c && canStartVideoCall(state.consents, c.reportedBy, caseId);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [ended, setEnded] = useState(false);

  const active = !!session && !session.endedAt && !ended;

  useEffect(() => {
    const timer = setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const hangUp = () => {
    if (session && !session.endedAt) useAppStore.getState().updateVideoCall(session.id, 'beendet');
    setEnded(true);
  };

  // Zurück oder Wischen beendet den Call wie „Auflegen“
  usePreventRemove(active, () => hangUp());

  useEffect(() => {
    if (!ended) return;
    const timer = setTimeout(() => router.replace(`/fall/${caseId}/befund`), 0);
    return () => clearTimeout(timer);
  }, [ended, caseId]);

  if (!c || !session || !allowed) return <Redirect href={`/fall/${caseId}/hilfe`} />;

  const summary = guideSummary(state, c);
  const steps = summary ? t.stepsShort(summary.done) : de.help.notStarted;
  const partner = session.expert.provider.name;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.photoInk }]}>
      <View
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t.expertVideo(session.expert.name)}
      />
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View style={styles.who}>
          <Text variant="labelStrong" tone="onPhoto">
            {t.expertLine(session.expert.name)}
          </Text>
          <Text variant="caption" tone="onPhoto">
            {t.companyLine(partner, mmss(seconds))}
          </Text>
          <View style={[styles.badge, { borderColor: theme.colors.onPhoto }]}>
            <Text variant="caption" tone="onPhoto">
              {t.noRecording}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.self,
            { borderColor: theme.colors.onPhoto, borderRadius: theme.radius.media },
          ]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t.selfVideo}
        />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <View
          style={[
            styles.subtitle,
            { backgroundColor: theme.colors.onPhoto, borderRadius: theme.radius.media },
          ]}
          accessibilityLiveRegion="polite"
        >
          <Text variant="body" tone="photoInk">
            {t.subtitle}
          </Text>
        </View>
        <View style={[styles.pill, { borderColor: theme.colors.onPhoto }]}>
          <Text variant="caption" tone="onPhoto">
            {t.sees(c.problemLabel, steps)}
          </Text>
        </View>
        <View style={styles.controls}>
          <RoundButton
            icon={mic ? 'mic' : 'micOff'}
            label={t.mic}
            selected={mic}
            onPress={() => setMic(!mic)}
          />
          <RoundButton
            icon={cam ? 'video' : 'videoOff'}
            label={t.camera}
            selected={cam}
            onPress={() => setCam(!cam)}
          />
          <RoundButton icon="hangUp" label={t.hangUp} danger onPress={hangUp} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, gap: 12 },
  who: { flex: 1, gap: 4 },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  self: { width: 96, height: 140, borderWidth: 2 },
  bottom: { paddingHorizontal: 20, gap: 10 },
  subtitle: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, maxWidth: 300 },
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 16 },
});
