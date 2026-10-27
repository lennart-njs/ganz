// Ableitungen aus dem Zustand für die Anzeige: Status eines Geräts, Fortschritt eines Falls, Ziel beim Fortsetzen.
import type { Href } from 'expo-router';

import { demoConfig } from '@/config/demo.config';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import type { Case, CaseStatus, Diagnosis, GuideRun } from '@/model/types';
import { selectOpenCaseForDevice, type AppData } from '@/store/appStore';

export function latestGuideRun(s: AppData, c: Case): GuideRun | undefined {
  const id = c.guideRunIds[c.guideRunIds.length - 1];
  return id ? s.guideRuns[id] : undefined;
}

/** Status-Zeile eines Geräts aus dem offenen Fall (B-49) */
export function deviceStatusLabel(s: AppData, deviceId: string): string {
  const c = selectOpenCaseForDevice(s, deviceId);
  if (!c) return de.deviceStatus.laeuft;
  if (c.status === 'offen' || c.status === 'selbsthilfe') return de.deviceStatus.problem;
  const booking = s.bookings.find((b) => b.caseId === c.id && b.status !== 'storniert');
  if (booking) return de.deviceStatus.reparatur(booking.slotLabel);
  return de.deviceStatus.hilfe;
}

/** Kurzer Stand eines Falls, z. B. „Schritt 4 von 7“ */
export function caseProgressLabel(s: AppData, c: Case): string {
  const run = latestGuideRun(s, c);
  if (c.status === 'selbsthilfe' && run && !run.endedAt) {
    const guide = guides[run.guideId as GuideId];
    if (guide) return de.a11y.stepOf(run.currentStep + 1, guide.steps.length);
  }
  return caseStatusLabel(c.status);
}

export function caseStatusLabel(status: CaseStatus): string {
  if (status === 'freigabe_noetig')
    return de.caseStatus.freigabe_noetig(demoConfig.insurer.shortName);
  return de.caseStatus[status];
}

/**
 * Hat der Fall schon Inhalt, den ein neuer Versuch nicht einfach ersetzen darf?
 * Ohne Fortschritt ersetzt ein neues Problem den Fall (Entscheidung 13).
 */
export function hasProgress(s: AppData, c: Case): boolean {
  if (c.status !== 'offen' && c.status !== 'selbsthilfe') return true;
  if (c.photoIds.length || c.claim || c.quoteId) return true;
  if (s.chatMessages.some((m) => m.caseId === c.id)) return true;
  if (s.videoSessions.some((v) => v.caseId === c.id)) return true;
  return c.guideRunIds.some((id) => {
    const run = s.guideRuns[id];
    return !!run && (run.completedSteps.length > 0 || !!run.endedAt);
  });
}

/** Wohin „Weitermachen“ führt */
export function resumeHref(s: AppData, c: Case): Href {
  // Jeder Fall ist ein Gespräch. Eine laufende Anleitung öffnet sich darüber.
  const run = latestGuideRun(s, c);
  const guideOpen = c.status === 'selbsthilfe' && run && !run.endedAt;
  return (guideOpen ? `/fall/${c.id}?weiter=anleitung` : `/fall/${c.id}`) as Href;
}

export interface GuideSummary {
  title: string;
  total: number;
  done: number;
  completedTitles: string[];
  aborted?: { step: number; title: string; note?: string };
}

/** Was die Fachkraft und der Versicherer über die Anleitung sehen (B-22): echte Schritte, auch 0 */
export function guideSummary(s: AppData, c: Case): GuideSummary | undefined {
  const run = latestGuideRun(s, c);
  if (!run) return undefined;
  const guide = guides[run.guideId as GuideId];
  if (!guide) return undefined;
  const completed = [...run.completedSteps].sort((a, b) => a - b);
  return {
    title: guide.title,
    total: guide.steps.length,
    done: completed.length,
    completedTitles: completed.map((i) => guide.steps[i]?.t ?? ''),
    aborted:
      run.abortedAtStep !== undefined
        ? {
            step: run.abortedAtStep + 1,
            title: guide.steps[run.abortedAtStep]?.t ?? '',
            note: run.abortNote,
          }
        : undefined,
  };
}

export function latestDiagnosis(s: AppData, c: Case, source?: Diagnosis['source']) {
  return [...c.diagnosisIds]
    .reverse()
    .map((id) => s.diagnoses.find((d) => d.id === id))
    .find((d) => d && (!source || d.source === source));
}
