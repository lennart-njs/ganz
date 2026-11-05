'use server';

import { revalidatePath } from 'next/cache';

import { de } from '@/i18n/de';
import { parseOptions, workflowStatuses, type WorkflowStatus } from '@/model/portal';
import type { PartStatus, RetailerDecision } from '@/model/sharing';

import { getCase, getSettings, listCases, sendAction, sendWorkflow } from '../../../lib/api';
import { allowedDecisions, warrantyCheck } from '../../../lib/check';
import { previousRepair } from '../../../lib/rework';

const t = de.portal.composer;
const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
/** Euro aus dem Zahlenfeld („180“, „180.5“ oder „180,50“) in Cent, sonst undefined */
const cents = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return s && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};

export interface ComposerState {
  ok?: boolean;
  /** Zähler: jede Antwort ein neuer Stand, damit das Formular sich leert */
  n: number;
  message?: string;
}

/** Antwortfeld: Nachricht, interne Notiz, Rückfrage, Terminvorschlag, Ersatzteil */
export async function compose(
  id: string,
  prev: ComposerState,
  form: FormData,
): Promise<ComposerState> {
  const kind = text(form, 'kind');
  let ok = false;
  switch (kind) {
    case 'nachricht':
      ok = await sendAction(id, { type: 'nachricht', text: text(form, 'text') });
      break;
    case 'notiz':
      ok = await sendWorkflow(id, { type: 'notiz', text: text(form, 'text') });
      break;
    case 'rueckfrage':
      ok = await sendAction(id, {
        type: 'rueckfrage',
        question: text(form, 'question'),
        options: parseOptions(text(form, 'options')),
      });
      break;
    case 'termin':
      ok = await sendAction(id, {
        type: 'termin',
        partnerName: text(form, 'partner'),
        slots: form
          .getAll('slot')
          .map((x) => String(x).trim())
          .filter(Boolean)
          .slice(0, 4),
      });
      break;
    case 'ersatzteil':
      ok = await sendAction(id, {
        type: 'ersatzteil',
        part: text(form, 'part'),
        status: (text(form, 'partStatus') === 'geliefert' ? 'geliefert' : 'bestellt') as PartStatus,
        eta: text(form, 'eta') || undefined,
      });
      break;
  }
  revalidatePath(`/faelle/${id}`);
  return {
    ok,
    n: prev.n + 1,
    message: ok ? (kind === 'notiz' ? t.saved : t.sent) : t.failed,
  };
}

/** Ein Klick: annehmen, entscheiden, abschließen, zuweisen, Stand */
export async function quick(id: string, form: FormData) {
  const kind = text(form, 'kind');
  if (kind === 'annehmen') await sendAction(id, { type: 'annehmen' });
  if (kind === 'entscheidung') {
    const decision = text(form, 'decision') as RetailerDecision;
    // Eine Ablehnung nur mit Grund, der Grund steht in der App unter der Absage
    const note = text(form, 'note') || undefined;
    // Nur, was die Regel zulässt (wie die Liste in der Fallakte)
    const [found, { settings }, { cases }] = await Promise.all([
      getCase(id),
      getSettings(),
      listCases(),
    ]);
    const allowed = found
      ? allowedDecisions(
          warrantyCheck(
            found.record.file,
            settings.rules,
            found.record,
            previousRepair(found.record, cases),
          ),
        )
      : [];
    // Kulanz mit Betrag: bis zur eigenen Grenze und nicht über den Voranschlag
    const total = found?.record.file.quote?.repair.total;
    const cover = decision === 'kulanz' ? cents(text(form, 'cover')) : undefined;
    const cap = Math.min(settings.rules.goodwillMaxCents, total ?? Infinity);
    const coverOk = decision !== 'kulanz' || (cover !== undefined && cover <= cap);
    if (allowed.includes(decision) && coverOk && (decision !== 'abgelehnt' || note))
      await sendAction(id, {
        type: 'entscheidung',
        decision,
        note,
        ...(cover !== undefined ? { coverCents: cover } : {}),
        ...(cover !== undefined && total !== undefined ? { totalCents: total } : {}),
      });
  }
  if (kind === 'kaufbeleg') {
    const photoId = text(form, 'photoId');
    if (photoId) await sendWorkflow(id, { type: 'kaufbeleg', photoId });
  }
  if (kind === 'abschliessen') await sendAction(id, { type: 'status', status: 'abgeschlossen' });
  if (kind === 'zuweisen') {
    const who = text(form, 'assigneeId');
    await sendWorkflow(id, { type: 'zuweisen', assigneeId: who || null });
  }
  if (kind === 'stand') {
    const status = text(form, 'status') as WorkflowStatus;
    if (workflowStatuses.includes(status)) await sendWorkflow(id, { type: 'stand', status });
  }
  revalidatePath(`/faelle/${id}`);
}
