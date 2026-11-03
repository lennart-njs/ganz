import Link from 'next/link';

import { de } from '@/i18n/de';

import { initials } from '../lib/view';
import { Live } from './Live';
import { NavPill } from './NavPill';
import { Shortcuts } from './Shortcuts';
import { Wordmark, zeichenSvg } from './Wordmark';

const t = de.portal;

export type NavPage = 'faelle' | 'auswertung' | 'einstellungen';

/** Schwebende Kapsel wie auf machs.io: Wortmarke, Bereiche, angemeldete Person, Abmelden */
export function Nav({
  dealer,
  user,
  current,
}: {
  dealer: string;
  user: string;
  current?: NavPage;
}) {
  const link = (page: NavPage, href: string, label: string) => (
    <Link className="plink" href={href} aria-current={current === page ? 'page' : undefined}>
      {label}
    </Link>
  );
  return (
    <header className="pnav">
      <NavPill label={t.nav.label} openLabel={t.nav.open} zeichen={zeichenSvg}>
        <Link className="pwm" href="/" aria-label={t.brand}>
          <Wordmark />
        </Link>
        <span className="ptag">{dealer}</span>
        {link('faelle', '/', t.nav.cases)}
        {link('auswertung', '/auswertung', t.nav.stats)}
        {link('einstellungen', '/einstellungen/profil', t.nav.settings)}
        <span className="pme" title={user}>
          <span className="avatar sm on-pill" aria-hidden>
            {initials(user)}
          </span>
          <span className="sr">{user}</span>
        </span>
        <form action="/abmelden" method="post">
          <button className="plink" type="submit">
            {t.nav.logout}
          </button>
        </form>
      </NavPill>
      <Live />
      <Shortcuts />
    </header>
  );
}
