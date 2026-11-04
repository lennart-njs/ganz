// Zusammenfassung vor „Zahlungspflichtig buchen“ im eigenen Schritt (Entscheidung Nr. 31): Betrieb,
// Zeitfenster, Adresse, Auftrag und der Betrag, den du mit dem Tap zahlst. Darunter der Satz, den
// der Store mit dem Tap stempelt (lib/legalTexts.ts, verbindliche_buchung). Gespräch und Termin
// zeigen dieselbe Karte, die Daten kommen aus den Fakten des Falls (CaseFacts.bindingDue).
import { StyleSheet, View } from 'react-native';

import { Card, FactList, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import type { BindingDue } from '@/model/policies/caseFacts';

export function BindingSummary({ due, partName }: { due: BindingDue; partName?: string }) {
  const t = de.appointment;
  const b = due.booking;
  const amount = formatEuro(due.amount);
  const items: [string, string][] = [
    [t.facts.partner, b.provider.name],
    [t.facts.slot, b.slotLabel],
  ];
  if (b.address) {
    items.push([t.facts.address, t.addressLine(b.address.street, b.address.zip, b.address.city)]);
  }
  items.push([t.facts.job, b.kind === 'reparatur' ? t.jobRepair(partName ?? '') : t.jobDiagnosis]);
  items.push([t.facts.due, due.reason === 'selbstbeteiligung' ? t.dueDeductible(amount) : amount]);
  return (
    <View style={styles.stack}>
      <Card>
        <FactList ruled items={items} />
      </Card>
      <Text variant="body">{t.bindingNotice(b.provider.name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { alignSelf: 'stretch', gap: 8 },
});
