'use client';

// Kleine Bausteine mit Verhalten: Auswahl, die sofort speichert; Gespräch, das unten beginnt;
// Knopf, der das Antwortfeld öffnet.
import { useEffect, useRef, useState } from 'react';

import { de } from '@/i18n/de';

import { openComposer } from './Composer';
import { Submit } from './Submit';

/**
 * Eine Auswahl wirkt sofort, wenn sie mit Maus oder Finger gewählt wird. Mit der Tastatur löst
 * jeder Pfeil ein change aus (Windows, WCAG 3.2.2): Dann wirkt sie erst mit „Übernehmen“ oder
 * Enter (Portal-Prüfung 05.11.).
 */
export function useIntentionalChange(
  onEnter: (el: HTMLSelectElement) => void = (el) => el.form?.requestSubmit(),
) {
  const pointer = useRef(false);
  const [pending, setPending] = useState(false);
  return {
    pending,
    reset: () => setPending(false),
    props: {
      onPointerDown: () => {
        pointer.current = true;
      },
      onKeyDown: (e: React.KeyboardEvent<HTMLSelectElement>) => {
        pointer.current = false;
        if (e.key === 'Enter' && pending) {
          e.preventDefault();
          onEnter(e.currentTarget);
        }
      },
    },
    /** true: gleich ausführen; sonst wartet die Auswahl auf „Übernehmen“ */
    immediate: () => {
      if (pointer.current) return true;
      setPending(true);
      return false;
    },
  };
}

export function AutoSelect({
  action,
  kind,
  name,
  value,
  label,
  options,
}: {
  action: (form: FormData) => Promise<void>;
  kind: string;
  name: string;
  value: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const change = useIntentionalChange();
  return (
    <form action={action} className="field" onSubmit={change.reset}>
      <input type="hidden" name="kind" value={kind} />
      <label htmlFor={`auto-${name}`}>{label}</label>
      <select
        id={`auto-${name}`}
        name={name}
        className="input"
        defaultValue={value}
        key={value}
        {...change.props}
        onChange={(e) => {
          if (change.immediate()) e.currentTarget.form?.requestSubmit();
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {change.pending ? <Submit className="btn btn-2 btn-sm">{de.portal.apply}</Submit> : null}
    </form>
  );
}

export function ScrollBox({
  count,
  label,
  children,
}: {
  count: number;
  label: string;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);
  return (
    <div ref={box} className="conv" role="log" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

export function OpenComposer({
  what,
  label,
}: {
  what: 'antworten' | 'termin' | 'rueckfrage' | 'ersatzteil';
  label: string;
}) {
  return (
    <button type="button" className="btn btn-block" onClick={() => openComposer(what)}>
      {label}
    </button>
  );
}
