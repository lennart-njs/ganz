import Link from 'next/link';

import { de } from '@/i18n/de';

import { Wordmark } from './Wordmark';

const t = de.portal;

/** Schwebende Kapsel wie auf machs.io: Wortmarke, Händler, Fälle, Abmelden */
export function Nav({ dealer, current }: { dealer: string; current?: 'faelle' }) {
  return (
    <header className="pnav">
      <nav className="pill" aria-label={t.nav.label}>
        <Link className="pwm" href="/" aria-label={t.brand}>
          <Wordmark />
        </Link>
        <span className="ptag">{dealer}</span>
        <Link className="plink" href="/" aria-current={current === 'faelle' ? 'page' : undefined}>
          {t.nav.cases}
        </Link>
        <form action="/abmelden" method="post">
          <button className="plink" type="submit">
            {t.nav.logout}
          </button>
        </form>
      </nav>
    </header>
  );
}
