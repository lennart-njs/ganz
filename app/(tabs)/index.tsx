import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DeviceCard } from '@/components/app/DeviceCard';
import { OpenCaseCard } from '@/components/app/OpenCaseCard';
import { SearchPill } from '@/components/app/SearchPill';
import { Button, Card, NavRow, Screen, Text, Wordmark } from '@/components/ds';
import { de } from '@/i18n/de';
import { formatMonthYear } from '@/i18n/format';
import { caseProgressLabel, deviceStatusLabel, resumeHref } from '@/lib/caseView';
import { deviceTitle } from '@/lib/devices';
import { selectOpenCases, useAppStore } from '@/store/appStore';

export default function Geraete() {
  const state = useAppStore();
  const devices = state.devices;
  const openCases = selectOpenCases(state);
  const first = devices[0];

  const report = () =>
    first ? router.push(`/fall/neu?geraet=${first.id}`) : router.push('/geraet/neu');

  return (
    <Screen>
      <Wordmark size={26} />
      <SearchPill onPress={report} />

      {openCases.map((c) => (
        <OpenCaseCard
          key={c.id}
          caseId={c.id}
          title={c.problemLabel}
          detail={caseProgressLabel(state, c)}
          onContinue={() => {
            if (c.pausedAt) state.resumeCase(c.id);
            router.push(resumeHref(state, c));
          }}
        />
      ))}

      <Text variant="h1" accessibilityRole="header" style={styles.section}>
        {de.home.myDevices}
      </Text>

      {devices.length === 0 ? (
        <Card>
          <Text variant="title">{de.home.emptyTitle}</Text>
          <Text variant="body" style={styles.gap}>
            {de.home.emptyText}
          </Text>
          <Button
            label={de.home.addDevice}
            icon="add"
            style={styles.gap}
            onPress={() => router.push('/geraet/neu')}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {devices.map((d) => (
            <DeviceCard
              key={d.id}
              title={deviceTitle(d)}
              meta={
                d.purchaseDate
                  ? de.device.meta(de.deviceCategory[d.category], formatMonthYear(d.purchaseDate))
                  : de.deviceCategory[d.category]
              }
              status={deviceStatusLabel(state, d.id)}
              protectedBy={!!d.contractId}
              onPress={() => router.push(`/geraet/${d.id}`)}
            />
          ))}
          <NavRow
            title={de.home.addDevice}
            sub={de.home.addDeviceSub}
            onPress={() => router.push('/geraet/neu')}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 12 },
  list: { gap: 20 },
  gap: { marginTop: 12 },
});
