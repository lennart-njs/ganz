import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Videocall() {
  return (
    <CasePlaceholder
      title={de.screens.videocall}
      step={9}
      primary={{ label: de.nav.hangUp, to: 'befund', nav: 'replace' }}
    />
  );
}
