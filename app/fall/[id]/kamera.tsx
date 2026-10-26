import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Kamera() {
  return (
    <CasePlaceholder
      title={de.screens.kamera}
      step={7}
      primary={{ label: de.nav.shutter, to: 'analyse' }}
    />
  );
}
