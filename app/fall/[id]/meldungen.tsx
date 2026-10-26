import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Meldungen() {
  return (
    <CasePlaceholder
      title={de.screens.meldungen}
      step={6}
      links={[{ label: de.displayMessages[1]!.code, to: 'anleitung' }]}
    />
  );
}
