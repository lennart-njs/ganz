'use client';

// Fehler beim Laden einer Seite, etwa wenn das Backend gerade nicht antwortet: ruhig, auf Deutsch,
// mit „Erneut versuchen“. Statt der englischen Seite von Next.
import Link from 'next/link';

import { de } from '@/i18n/de';

import { Wordmark } from '../components/Wordmark';

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
        <div className="wm" aria-label={de.portal.brand}>
          <Wordmark />
        </div>
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
