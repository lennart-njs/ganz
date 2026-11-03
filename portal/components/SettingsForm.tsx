'use client';

import { useActionState } from 'react';

import { de } from '@/i18n/de';

import type { SaveState } from '../app/einstellungen/[bereich]/actions';

export function SettingsForm({
  action,
  label,
  children,
}: {
  action: (prev: SaveState, form: FormData) => Promise<SaveState>;
  label: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, { n: 0 });
  return (
    <form action={formAction} className="sform" aria-label={label}>
      {children}
      <div className="sbar">
        <button className="btn" type="submit" disabled={pending}>
          {de.portal.settings.save}
        </button>
        {state.message ? (
          <span className={`hint${state.ok ? '' : ' bad'}`} role="status" key={state.n}>
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
