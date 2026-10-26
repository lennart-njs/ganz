import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Rueckfrage() {
  return (
    <CasePlaceholder
      title={de.screens.rueckfrage}
      step={7}
      primary={{ label: de.nav.toResult, to: 'ergebnis', nav: 'replace' }}
    />
  );
}
