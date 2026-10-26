import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Ergebnis() {
  return (
    <CasePlaceholder
      title={de.screens.ergebnis}
      step={7}
      links={[
        { label: de.nav.doesNotFit, to: '/fall/neu', nav: 'dismissTo' },
        { label: de.nav.getHelp, to: 'hilfe' },
      ]}
      primary={{ label: de.nav.startGuide, to: 'anleitung' }}
    />
  );
}
