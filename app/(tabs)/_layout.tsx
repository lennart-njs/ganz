import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ds';
import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

function tabIcon(name: IconName) {
  function TabIcon({ focused }: { focused: boolean }) {
    return <Icon name={name} size={22} color={focused ? 'textStrong' : 'textMuted'} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.bgPage },
        tabBarActiveTintColor: theme.colors.textStrong,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.bgPage,
          borderTopColor: theme.colors.borderSubtle,
          height: 70 + insets.bottom,
          paddingTop: 4,
          paddingBottom: insets.bottom + 8,
        },
        tabBarLabelStyle: { fontFamily: theme.fontFamily.medium, fontSize: 12, lineHeight: 16 },
        // Wie im System: Tab-Beschriftungen wachsen nicht mit. Langes Drücken zeigt sie groß (iOS).
        tabBarAllowFontScaling: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: de.tabs.devices, tabBarIcon: tabIcon('devices') }}
      />
      <Tabs.Screen name="faelle" options={{ title: de.tabs.cases, tabBarIcon: tabIcon('cases') }} />
      <Tabs.Screen
        name="profil"
        options={{ title: de.tabs.profile, tabBarIcon: tabIcon('profile') }}
      />
    </Tabs>
  );
}
