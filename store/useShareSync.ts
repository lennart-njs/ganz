// Hält geteilte Fälle mit dem Backend gleich (Entscheidung 19, 20):
// sendet die Akte nach jeder Änderung, holt Antworten des Händlers ab und meldet den Widerruf.
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { buildSharedCaseFile, photoForShare, photosToShare } from '@/lib/sharing';
import { services } from '@/services';

import { useAppStore, type AppData } from './appStore';

const POLL_MS = 15_000;
const busy = new Set<string>();

const eventCount = (s: AppData, caseId: string) =>
  s.events.filter((e) => e.caseId === caseId).length;

/** Ein Durchgang für einen Fall. Exportiert für Tests. */
export async function syncShare(caseId: string, poll = true): Promise<void> {
  if (busy.has(caseId)) return;
  busy.add(caseId);
  try {
    const s = useAppStore.getState();
    const share = s.shares[caseId];
    if (!share || share.revoked) return;
    const consent = s.consents.find((k) => k.id === share.consentId);

    // Widerrufen: dem Backend melden, danach nichts mehr senden
    if (!consent || consent.revokedAt) {
      if (share.token) await services.backend.revoke(caseId, share.token);
      useAppStore.getState().updateShare(caseId, { revoked: true });
      return;
    }

    // Akte senden, wenn sich der Fall geändert hat
    const count = eventCount(s, caseId);
    if (share.syncedEvents !== count || !share.token) {
      const photos = await Promise.all(photosToShare(s, caseId).map(photoForShare));
      const file = buildSharedCaseFile(
        useAppStore.getState(),
        caseId,
        photos,
        new Date().toISOString(),
      );
      if (file) {
        const result = await services.backend.share(file, share.token);
        if (result.ok) {
          useAppStore.getState().updateShare(caseId, { token: result.token, syncedEvents: count });
        } else if (result.reason === 'widerrufen') {
          useAppStore.getState().updateShare(caseId, { revoked: true });
        }
      }
    }

    // Antworten des Händlers abholen
    const token = useAppStore.getState().shares[caseId]?.token;
    if (poll && token) {
      const since = useAppStore.getState().shares[caseId]?.retailerSince;
      const events = await services.backend.retailerEvents(caseId, token, since);
      if (events?.length) useAppStore.getState().importRetailerEvents(caseId, events);
    }
  } finally {
    busy.delete(caseId);
  }
}

export function useShareSync() {
  const shares = useAppStore((s) => s.shares);
  const events = useAppStore((s) => s.events);
  const consents = useAppStore((s) => s.consents);

  // Nach jeder Änderung am Fall oder an der Einwilligung: senden (ohne Abruf)
  useEffect(() => {
    for (const caseId of Object.keys(shares)) void syncShare(caseId, false);
  }, [shares, events, consents]);

  // Regelmäßig und beim Zurückkehren in die App: Antworten abholen
  useEffect(() => {
    const all = () => {
      for (const caseId of Object.keys(useAppStore.getState().shares)) void syncShare(caseId);
    };
    all();
    const timer = setInterval(all, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') all();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
}
