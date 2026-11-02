'use server';

import { redirect } from 'next/navigation';

import type { RetailerAction } from '@/model/sharing';

import { sendAction } from '../../../lib/api';

const back = (id: string, ok: boolean) =>
  redirect(`/faelle/${encodeURIComponent(id)}?${ok ? 'ok' : 'fehler'}=${Date.now()}`);

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

async function run(id: string, action: RetailerAction) {
  back(id, await sendAction(id, action));
}

export async function accept(id: string) {
  await run(id, { type: 'annehmen' });
}

export async function ask(id: string, form: FormData) {
  const options = text(form, 'options')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 4);
  await run(id, { type: 'rueckfrage', question: text(form, 'question'), options });
}

export async function decide(id: string, form: FormData) {
  await run(id, {
    type: 'entscheidung',
    decision: text(form, 'decision') as Extract<
      RetailerAction,
      { type: 'entscheidung' }
    >['decision'],
    note: text(form, 'note') || undefined,
  });
}

export async function assign(id: string, form: FormData) {
  await run(id, {
    type: 'betrieb',
    partnerName: text(form, 'partner'),
    slot: text(form, 'slot') || undefined,
  });
}

export async function report(id: string, form: FormData) {
  await run(id, {
    type: 'status',
    status: text(form, 'status') as Extract<RetailerAction, { type: 'status' }>['status'],
    note: text(form, 'note') || undefined,
  });
}
