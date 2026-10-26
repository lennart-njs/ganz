import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Befund() {
  return (
    <CasePlaceholder
      title={de.screens.befund}
      step={9}
      links={[
        { label: de.nav.solvedInCall, to: 'abschluss' },
        { label: de.nav.repair, to: 'kosten' },
      ]}
    />
  );
}
