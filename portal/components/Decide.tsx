'use client';

// Entscheiden in der Fallakte. „Ablehnen“ braucht zwei Schritte und einen Grund: Ein Fehlklick
// schickt der Kundschaft sonst sofort eine Absage (Portal-Prüfung 05.11.). Der Grund steht in der
// App unter der Absage. „Kulanz“ braucht einen Betrag bis zur eigenen Grenze. Die App zeigt ihn
// wie einen Beleg: „Fründ übernimmt 180 €, du zahlst 64 €.“
import { useState } from 'react';

import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import type { RetailerDecision } from '@/model/sharing';

import { Submit } from './Submit';

const t = de.portal.check;

export function DecisionButton({
  action,
  decision,
  big,
  goodwill,
}: {
  action: (form: FormData) => void | Promise<void>;
  decision: RetailerDecision;
  /** Großer Knopf unter „Als Nächstes“, sonst klein in der Liste */
  big?: boolean;
  /** Kulanz: eigene Grenze und Kostenvoranschlag, in Cent */
  goodwill?: { maxCents: number; totalCents?: number };
}) {
  const [asking, setAsking] = useState(false);
  const cls = big ? 'btn btn-block' : 'btn btn-2 btn-sm';
  if (decision === 'kulanz' && goodwill) {
    if (!asking)
      return (
        <button type="button" className={cls} onClick={() => setAsking(true)}>
          {t.confirm.kulanz}
        </button>
      );
    return <GoodwillForm action={action} {...goodwill} onCancel={() => setAsking(false)} />;
  }
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

/** Kulanz mit Betrag: vorbelegt mit dem Voranschlag, höchstens bis zur eigenen Grenze */
function GoodwillForm({
  action,
  maxCents,
  totalCents,
  onCancel,
}: {
  action: (form: FormData) => void | Promise<void>;
  maxCents: number;
  totalCents?: number;
  onCancel: () => void;
}) {
  const cap = totalCents === undefined ? maxCents : Math.min(maxCents, totalCents);
  const [euro, setEuro] = useState(String(cap / 100));
  const cover = Math.round(Number(euro.replace(',', '.')) * 100);
  const valid = Number.isFinite(cover) && cover >= 0 && cover <= cap;
  return (
    <form action={action} className="reject">
      <input type="hidden" name="kind" value="entscheidung" />
      <input type="hidden" name="decision" value="kulanz" />
      <label className="field">
        <span>{t.cover}</span>
        <input
          name="cover"
          className="input num"
          type="number"
          inputMode="decimal"
          min={0}
          max={cap / 100}
          step="0.01"
          required
          autoFocus
          value={euro}
          onChange={(e) => setEuro(e.target.value)}
        />
      </label>
      <p className="row-sub num" aria-live="polite">
        {totalCents === undefined
          ? t.goodwillMax(formatEuro(maxCents))
          : `${t.quote(formatEuro(totalCents))} · ${t.customerPays(
              formatEuro(Math.max(0, totalCents - (valid ? cover : 0))),
            )}`}
      </p>
      <div className="reject-actions">
        <Submit className="btn btn-sm" disabled={!valid}>
          {t.coverSend}
        </Submit>
        <button type="button" className="btn btn-2 btn-sm" onClick={onCancel}>
          {t.rejectCancel}
        </button>
      </div>
    </form>
  );
}
