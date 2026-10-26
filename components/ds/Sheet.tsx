import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { Text } from './Text';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Bottom Sheet. Tippen auf den Hintergrund, die Android-Zurück-Taste und VoiceOver-Escape schließen es. */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.backdrop }]}
          accessibilityRole="button"
          accessibilityLabel={de.a11y.close}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={[
            styles.panel,
            {
              backgroundColor: theme.colors.bgPage,
              borderTopLeftRadius: theme.radius.lg,
              borderTopRightRadius: theme.radius.lg,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              paddingHorizontal: theme.gutter,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.borderDefault }]} />
          <ScrollView
            contentContainerStyle={styles.content}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  panel: { maxHeight: '90%', paddingTop: 8 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 12 },
  content: { gap: 14, paddingBottom: 8 },
});
