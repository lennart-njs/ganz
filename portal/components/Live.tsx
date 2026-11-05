'use client';

// Live statt Neuladen: fragt alle 5 Sekunden, ob sich etwas getan hat. Wenn ja, wird die Seite
// still aktualisiert, und bei neuen Nachrichten oder Fällen erscheint ein Hinweis.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { de } from '@/i18n/de';

const t = de.portal.live;
const POLL_MS = 5000;
/** So lange bleibt ein Hinweis stehen. Mit Maus oder Fokus darauf bleibt er, bis man ihn schließt. */
const TOAST_MS = 20_000;

interface Pulse {
  sig: string;
  latest?: { caseId: string; who: string; at: string; kind: 'fall' | 'nachricht' };
}

export function Live() {
  const router = useRouter();
  const last = useRef<Pulse>(undefined);
  const [toast, setToast] = useState<Pulse['latest']>();
  const [hold, setHold] = useState(false);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/live', { cache: 'no-store' });
        if (!res.ok || !res.headers.get('content-type')?.includes('json')) return;
        const next = (await res.json()) as Pulse;
        const prev = last.current;
        last.current = next;
        if (!prev || stop || prev.sig === next.sig) return;
        router.refresh();
        if (next.latest && (!prev.latest || next.latest.at > prev.latest.at)) setToast(next.latest);
      } catch {
        // Netz weg: beim nächsten Mal wieder
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    const vis = () => !document.hidden && void tick();
    document.addEventListener('visibilitychange', vis);
    return () => {
      stop = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [router]);

  useEffect(() => {
    if (!toast || hold) return;
    const id = setTimeout(() => setToast(undefined), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast, hold]);

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toast ? (
        <div
          className="toast"
          onMouseEnter={() => setHold(true)}
          onMouseLeave={() => setHold(false)}
          onFocus={() => setHold(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setHold(false);
          }}
        >
          <span className="dot" aria-hidden />
          <span>
            <b>{toast.kind === 'fall' ? t.newCase(toast.caseId) : t.newMessage(toast.who)}</b>
            <span className="row-sub num">
              {' '}
              · {toast.kind === 'fall' ? toast.who : toast.caseId}
            </span>
          </span>
          <Link className="btn btn-sm" href={`/faelle/${encodeURIComponent(toast.caseId)}`}>
            {t.open}
          </Link>
          <button
            type="button"
            className="x"
            aria-label={t.dismiss}
            onClick={() => {
              setToast(undefined);
              setHold(false);
            }}
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
