import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Analyse() {
  return (
    <CasePlaceholder
      title={de.screens.analyse}
      step={7}
      links={[
        { label: de.nav.toQuestion, to: 'rueckfrage', nav: 'replace' },
        { label: de.nav.blurry, to: 'kamera', nav: 'dismissTo' },
      ]}
      primary={{ label: de.nav.toResult, to: 'ergebnis', nav: 'replace' }}
    />
  );
}
