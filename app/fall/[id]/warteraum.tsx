import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Warteraum() {
  return (
    <CasePlaceholder
      title={de.screens.warteraum}
      step={9}
      links={[
        { label: de.nav.connected, to: 'videocall', nav: 'replace' },
        { label: de.nav.noExpert, to: 'status', nav: 'replace' },
      ]}
    />
  );
}
