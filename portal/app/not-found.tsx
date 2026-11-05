// Unbekannte Adresse oder ein Fall, der nicht mehr freigegeben ist: auf Deutsch, mit Weg zurück.
import Link from 'next/link';

import { de } from '@/i18n/de';

import { Wordmark } from '../components/Wordmark';

const t = de.portal.problem;

export default function NichtGefunden() {
  return (
    <main className="login panel chambray problem">
      <div className="card paper">
        <div className="wm" aria-label={de.portal.brand}>
          <Wordmark />
        </div>
        <h1 className="h2">{t.missingTitle}</h1>
        <p>{t.missingText}</p>
        <div className="actions">
          <Link className="btn" href="/">
            {t.toCases}
          </Link>
        </div>
      </div>
    </main>
  );
}
