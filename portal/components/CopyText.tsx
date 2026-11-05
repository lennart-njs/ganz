'use client';

// Text zum Kopieren: sichtbar und markierbar, dazu ein Knopf. Ohne Zwischenablage (http im
// Netzwerk der Messe) markiert der Knopf den Text, kopieren geht dann mit Strg/Cmd + C.
import { useRef, useState } from 'react';

import { de } from '@/i18n/de';

const t = de.portal.claim;

export function CopyText({ text, label }: { text: string; label: string }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [done, setDone] = useState<'kopiert' | 'markiert'>();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone('kopiert');
    } catch {
      area.current?.select();
      setDone('markiert');
    }
  };
  return (
    <div className="stack copytext">
      <label className="sr" htmlFor="claim-text">
        {label}
      </label>
      <textarea
        id="claim-text"
        ref={area}
        className="input"
        readOnly
        rows={Math.min(14, text.split('\n').length)}
        value={text}
      />
      <div className="reject-actions">
        <button type="button" className="btn btn-2 btn-sm" onClick={copy}>
          {t.copy}
        </button>
        <span className="row-sub" role="status">
          {done === 'kopiert' ? t.copied : done === 'markiert' ? t.selected : ''}
        </span>
      </div>
    </div>
  );
}
