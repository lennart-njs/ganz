import { CasePlaceholder } from '@/components/nav/CasePlaceholder';
import { de } from '@/i18n/de';

export default function Anleitung() {
  return (
    <CasePlaceholder
      title={de.screens.anleitung}
      step={8}
      links={[
        { label: de.nav.getHelp, to: 'hilfe' },
        { label: de.nav.runsAgain, to: 'abschluss' },
      ]}
    />
  );
}
