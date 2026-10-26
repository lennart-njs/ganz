import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Kosten() {
  return (
    <CasePlaceholder
      title={de.screens.kosten}
      step={10}
      primary={{ label: de.nav.reportClaim, to: 'termin' }}
    />
  );
}
