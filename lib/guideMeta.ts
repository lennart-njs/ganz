// Ergänzungen zu den Anleitungen, ohne ihren Inhalt zu ändern.
import type { GuideId } from '@/data/guides';
import type { Case, Guide } from '@/model/types';

/** Schritte, die vor dem Weitergehen eine Sicherheitsbestätigung brauchen (Q-13). Index 0-basiert. */
export const SAFETY_CONFIRM: Partial<Record<GuideId, Record<number, 'waterproof'>>> = {
  waterproof: { 0: 'waterproof' },
};

/** Wie die Anleitung endet: Störung fragt „Läuft wieder?“, Pflege und Hinweis enden mit „Fertig“ (B-08). */
export function guideEnding(
  guide: Guide,
  c: Pick<Case, 'entry'>,
): 'stoerung' | 'fertig' | 'noSelf' {
  if (guide.noSelf) return 'noSelf';
  if (c.entry === 'pflege' || guide.kind !== 'stoerung') return 'fertig';
  return 'stoerung';
}

/** Werkzeug aus allen Schritten, ohne Doppelte (Q-2) */
export function guideTools(guide: Guide): string[] {
  return [...new Set(guide.steps.map((s) => s.tool).filter((x): x is string => !!x))];
}
