import { Pressable, StyleSheet, View } from 'react-native';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface HeaderButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
}

function HeaderButton({ icon, label, onPress }: HeaderButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        {
          width: theme.size.hitMin,
          height: theme.size.hitMin,
          borderRadius: theme.radius.pill,
          backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surfaceCard,
        },
      ]}
    >
      <Icon name={icon} size={22} strokeWidth={2.2} />
    </Pressable>
  );
}

interface AppHeaderProps {
  title?: string;
  onBack?: () => void;
  /** X oben rechts: im Fall öffnet es das Schließen-Sheet */
  onClose?: () => void;
}

/** Kopfzeile: runder Zurück-Button (44 pt), Titel mittig, optional Schließen. */
export function AppHeader({ title, onBack, onClose }: AppHeaderProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {onBack ? <HeaderButton icon="back" label={de.a11y.back} onPress={onBack} /> : null}
      </View>
      <View style={styles.title}>
        {title ? (
          <Text variant="label" align="center" accessibilityRole="header">
            {title}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.right]}>
        {onClose ? <HeaderButton icon="close" label={de.a11y.close} onPress={onClose} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 52,
  },
  side: { width: 52 },
  right: { alignItems: 'flex-end' },
  title: { flex: 1, paddingHorizontal: 4 },
  round: { alignItems: 'center', justifyContent: 'center' },
});
