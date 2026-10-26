import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Termin() {
  return (
    <CasePlaceholder
      title={de.screens.termin}
      step={10}
      primary={{ label: de.nav.requestAppointment, to: 'status' }}
    />
  );
}
