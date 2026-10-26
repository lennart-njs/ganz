import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Hilfe() {
  return (
    <CasePlaceholder
      title={de.screens.hilfe}
      step={9}
      links={[{ label: de.nav.onSiteDiagnosis, to: 'termin' }]}
      primary={{ label: de.nav.startVideo, to: 'warteraum' }}
    />
  );
}
