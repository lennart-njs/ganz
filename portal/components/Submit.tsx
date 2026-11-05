'use client';

// Knopf für Formulare mit Server-Aktion: gesperrt, solange die Aktion läuft. Ein Doppelklick
// schickt nichts doppelt an die Kundschaft (Portal-Prüfung 05.11.).
import { useFormStatus } from 'react-dom';

export function Submit({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {children}
    </button>
  );
}
