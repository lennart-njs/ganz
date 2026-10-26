// Ableitungen aus dem Zustand für die Anzeige: Status eines Geräts, Fortschritt eines Falls, Ziel beim Fortsetzen.
import type { Href } from 'expo-router';

import { demoConfig } from '@/config/demo.config';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import type { Case, CaseStatus, GuideRun } from '@/model/types';
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

/** Wohin „Weitermachen“ führt */
export function resumeHref(s: AppData, c: Case): Href {
  const base = `/fall/${c.id}`;
  switch (c.status) {
    case 'offen':
      return (c.diagnosisIds.length ? `${base}/ergebnis` : `/fall/neu?fall=${c.id}`) as Href;
    case 'selbsthilfe':
      return `${base}/anleitung` as Href;
    case 'eskaliert':
      return `${base}/hilfe` as Href;
    default:
      return `${base}/status` as Href;
  }
}
