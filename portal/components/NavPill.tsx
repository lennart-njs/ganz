'use client';

// Kapsel wie auf machs.io: Beim Runterscrollen wird sie zum Zeichen „m’“,
// beim Hochscrollen oder Tippen auf das Zeichen wieder zur vollen Leiste.
import { useCallback, useEffect, useRef, useState } from 'react';

const MINI = 56;
/** Nahe am Seitenanfang immer die volle Leiste */
const TOP = 120;
/** So weit muss nach dem Aufklappen wieder nach unten gescrollt werden */
const RUN = 48;

export function NavPill({
  label,
  openLabel,
  zeichen,
  children,
}: {
  label: string;
  openLabel: string;
  zeichen: string;
  children: React.ReactNode;
}) {
  const pill = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLElement>(null);
  const mark = useRef<HTMLButtonElement>(null);
  const [small, setSmall] = useState(false);
  const [full, setFull] = useState<number>();

  // Breite der vollen Leiste messen, damit die Breite animiert werden kann
  const measure = useCallback(() => {
    if (row.current) setFull(Math.ceil(row.current.scrollWidth));
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    void document.fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    let last = window.scrollY;
    let turn = last;
    let tick = false;
    const onScroll = () => {
      tick = false;
      const y = Math.max(0, window.scrollY);
      const d = y - last;
      if (y < TOP) setSmall(false);
      else if (d < 0) setSmall(false);
      else if (d > 0 && y - turn > RUN) setSmall(true);
      if (d < 0) turn = y;
      last = y;
    };
    const handler = () => {
      if (!tick) {
        tick = true;
        requestAnimationFrame(onScroll);
      }
    };
    // Tippen auf das Zeichen: ab hier zählt der Weg nach unten neu
    const reset = () => {
      turn = window.scrollY;
    };
    window.addEventListener('scroll', handler, { passive: true });
    mark.current?.addEventListener('click', reset);
    const m = mark.current;
    return () => {
      window.removeEventListener('scroll', handler);
      m?.removeEventListener('click', reset);
    };
  }, []);

  useEffect(() => {
    if (row.current) row.current.inert = small;
  }, [small]);

  return (
    <div
      ref={pill}
      className={`pill${small ? ' zeichen' : ''}`}
      style={full ? { width: small ? MINI : full } : undefined}
    >
      <button
        ref={mark}
        type="button"
        className="pmark"
        aria-label={openLabel}
        aria-hidden={!small}
        tabIndex={small ? 0 : -1}
        onClick={(e) => {
          setSmall(false);
          // Per Tastatur: Fokus auf den ersten Eintrag der Leiste
          if (e.detail === 0) row.current?.querySelector<HTMLElement>('a,button')?.focus();
        }}
        dangerouslySetInnerHTML={{ __html: zeichen }}
      />
      <nav ref={row} className="pill-row" aria-label={label}>
        {children}
      </nav>
    </div>
  );
}
