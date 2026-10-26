import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';

type HintKey = Exclude<keyof typeof de.demoHints, 'label' | 'dismiss'>;

/** Schließbarer Tipp für den Pitch (B-47). Nur im Demo-Modus mit Hinweisen. */
export function DemoHint({ id }: { id: HintKey }) {
  const theme = useTheme();
  const visible = useAppStore(
    (s) => demoConfig.demo.enabled && s.demo.hints && !s.demo.dismissedHints.includes(id),
  );
  if (!visible) return null;
  const dismiss = () => {
    const s = useAppStore.getState();
    s.setDemo({ dismissedHints: [...s.demo.dismissedHints, id] });
  };
  return (
    <View
      style={[
        styles.hint,
        { backgroundColor: theme.colors.surfaceInverse, borderRadius: theme.radius.md },
      ]}
    >
      <View style={[styles.tag, { borderColor: theme.colors.textOnInverseMuted }]}>
        <Text variant="caption" tone="onInverseMuted">
          {de.demoHints.label}
        </Text>
      </View>
      <Text variant="meta" tone="onInverse" style={styles.text}>
        {de.demoHints[id]}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={de.demoHints.dismiss}
        onPress={dismiss}
        hitSlop={8}
        style={styles.close}
      >
        <Icon name="close" size={16} color="textOnInverse" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  text: { flex: 1, paddingVertical: 6 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
