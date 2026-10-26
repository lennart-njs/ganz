import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Status() {
  return (
    <CasePlaceholder
      title={de.screens.status}
      step={11}
      links={[
        { label: de.nav.repaired, to: 'abschluss' },
        { label: de.nav.rejected, to: 'kosten' },
        { label: de.nav.caseFile, to: 'fallakte' },
      ]}
    />
  );
}
