'use client';

// Knopf für Formulare mit Server-Aktion: gesperrt, solange die Aktion läuft. Ein Doppelklick
// schickt nichts doppelt an die Kundschaft (Portal-Prüfung 05.11.).
import { useFormStatus } from 'react-dom';

export function Submit({
  className,
  children,
  disabled,
}: {
  className: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending || disabled} aria-busy={pending}>
      {children}
    </button>
  );
}
