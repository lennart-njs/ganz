import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Abschluss() {
  return (
    <CasePlaceholder
      title={de.screens.abschluss}
      step={11}
      links={[{ label: de.nav.stillBroken, to: 'hilfe' }]}
      primary={{ label: de.nav.done, to: '/faelle', nav: 'dismissTo' }}
    />
  );
}
