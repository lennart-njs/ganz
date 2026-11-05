// Während eine Seite lädt: eine ruhige Zeile statt nichts. Erst nach einer kurzen Pause sichtbar
// (CSS), damit schnelle Wechsel nicht flackern.
import { de } from '@/i18n/de';

export default function Laden() {
  return (
    <main className="loading" aria-busy="true">
      <p role="status">{de.portal.problem.loading}</p>
    </main>
  );
}
