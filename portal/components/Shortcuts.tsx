'use client';

// Tastenkürzel im ganzen Portal. „?“ zeigt die Übersicht. Liste und Fallakte haben eigene Kürzel
// (j, k, x, Enter, r, n), die hier nur für die Übersicht stehen.
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { de } from '@/i18n/de';

const t = de.portal.keys;

/** Tippt jemand gerade in ein Feld? Dann keine Kürzel. */
export const typing = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return (
    !!el &&
    (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) &&
    (el as HTMLInputElement).type !== 'checkbox'
  );
};

export function Shortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let g = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
      if (e.key === '?') {
        e.preventDefault();
        setOpen((x) => !x);
        return;
      }
      if (e.key === '/') {
        const search = document.querySelector<HTMLInputElement>('[data-search]');
        if (search) {
          e.preventDefault();
          search.focus();
        }
        return;
      }
      if (e.key === 'r' || e.key === 'n') {
        const target = document.querySelector<HTMLElement>(
          e.key === 'r' ? '[data-reply]' : '[data-note]',
        );
        if (target) {
          e.preventDefault();
          target.click();
        }
        return;
      }
      if (e.key === 'g') {
        g = Date.now();
        return;
      }
      if (Date.now() - g < 1200) {
        const to = { f: '/', a: '/auswertung', e: '/einstellungen/profil' }[e.key];
        g = 0;
        if (to) router.push(to);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="keys"
      aria-label={t.title}
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === dialog.current && setOpen(false)}
    >
      <div className="card paper">
        <h2 className="h2">{t.title}</h2>
        <dl className="keylist">
          {t.items.map(([k, label]) => (
            <div key={k}>
              <dt>
                {k.split('  ').map((x) => (
                  <kbd key={x}>{x}</kbd>
                ))}
              </dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className="btn btn-2 btn-sm" onClick={() => setOpen(false)}>
          {t.close}
        </button>
      </div>
    </dialog>
  );
}
