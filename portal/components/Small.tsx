'use client';

// Kleine Bausteine mit Verhalten: Auswahl, die sofort speichert; Gespräch, das unten beginnt;
// Knopf, der das Antwortfeld öffnet.
import { useEffect, useRef } from 'react';

import { openComposer } from './Composer';

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
  return (
    <form action={action} className="field">
      <input type="hidden" name="kind" value={kind} />
      <label htmlFor={`auto-${name}`}>{label}</label>
      <select
        id={`auto-${name}`}
        name={name}
        className="input"
        defaultValue={value}
        key={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
