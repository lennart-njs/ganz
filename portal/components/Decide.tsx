'use client';

// Entscheiden in der Fallakte. „Ablehnen“ braucht zwei Schritte und einen Grund: Ein Fehlklick
// schickt der Kundschaft sonst sofort eine Absage (Portal-Prüfung 05.11.). Der Grund steht in der
// App unter der Absage.
import { useState } from 'react';

import { de } from '@/i18n/de';
import type { RetailerDecision } from '@/model/sharing';

import { Submit } from './Submit';

const t = de.portal.check;

export function DecisionButton({
  action,
  decision,
  big,
}: {
  action: (form: FormData) => void | Promise<void>;
  decision: RetailerDecision;
  /** Großer Knopf unter „Als Nächstes“, sonst klein in der Liste */
  big?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const cls = big ? 'btn btn-block' : 'btn btn-2 btn-sm';
  if (decision !== 'abgelehnt') {
    return (
      <form action={action}>
        <input type="hidden" name="kind" value="entscheidung" />
        <input type="hidden" name="decision" value={decision} />
        <Submit className={cls}>{t.confirm[decision]}</Submit>
      </form>
    );
  }
  if (!asking) {
    return (
      <button type="button" className={cls} onClick={() => setAsking(true)}>
        {t.confirm.abgelehnt}
      </button>
    );
  }
  return (
    <form action={action} className="reject">
      <input type="hidden" name="kind" value="entscheidung" />
      <input type="hidden" name="decision" value="abgelehnt" />
      <label className="field">
        <span>{t.rejectReason}</span>
        <select name="note" className="input" required defaultValue="" autoFocus>
          <option value="" disabled>
            {t.rejectPick}
          </option>
          {t.rejectReasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <div className="reject-actions">
        <Submit className="btn btn-sm">{t.rejectSend}</Submit>
        <button type="button" className="btn btn-2 btn-sm" onClick={() => setAsking(false)}>
          {t.rejectCancel}
        </button>
      </div>
    </form>
  );
}
