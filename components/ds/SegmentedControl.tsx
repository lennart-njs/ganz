import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /** 'inverse' über Foto oder Kamera, in beiden Modi gleich */
  tone?: 'default' | 'inverse';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  tone = 'default',
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const inverse = tone === 'inverse';
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        {
          borderRadius: theme.radius.segment,
          backgroundColor: inverse ? theme.colors.scrim : theme.colors.surfaceMuted,
        },
      ]}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            style={[
              styles.segment,
              {
                minHeight: theme.size.hitMin,
                backgroundColor: on
                  ? inverse
                    ? theme.colors.onPhoto
                    : theme.colors.surfaceRaised
                  : 'transparent',
              },
            ]}
          >
            <Text
              variant="label"
              align="center"
              tone={inverse ? (on ? 'photoInk' : 'onPhoto') : on ? 'strong' : 'body'}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', flexWrap: 'wrap', padding: 3, gap: 2 },
  segment: {
    flexGrow: 1,
    borderRadius: 7,
    paddingHorizontal: 14,
    paddingVertical: 6,
    justifyContent: 'center',
  },
});
