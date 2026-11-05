'use client';

// Fehler beim Laden einer Seite, etwa wenn das Backend gerade nicht antwortet: ruhig, auf Deutsch,
// mit „Erneut versuchen“. Statt der englischen Seite von Next. Ohne Wortmarke: Die liest ihre Datei
// auf dem Server (node:fs), diese Seite läuft im Browser.
import Link from 'next/link';

import { de } from '@/i18n/de';

const t = de.portal.problem;

export default function Fehler({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="login panel chambray problem">
      <div className="card paper" role="alert">
        <h1 className="h2">{t.title}</h1>
        <p>{t.text}</p>
        <div className="actions">
          <button type="button" className="btn" onClick={reset}>
            {t.retry}
          </button>
          <Link className="btn btn-2" href="/">
            {t.toCases}
          </Link>
        </div>
      </div>
    </main>
  );
}
