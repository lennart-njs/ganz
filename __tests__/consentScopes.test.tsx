// Test je Zweck: Die Vorschau zeigt genau die Kategorien, die die Bestätigung speichert. Beide
// kommen aus model/policies/consentScopes.ts (ZUKUNFTSPLAN Phase 1, Abnahme; R-14).
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { CASE_FILE_CARD } from '@/components/app/CaseFileCard';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { chatContext } from '@/lib/chat/context';
import type { ChatContext } from '@/lib/chat/prompt';
import { categoryLabels, scopeLabels } from '@/lib/consent';
import { legalParts, textStamp, type LegalTextKey } from '@/lib/legalTexts';
import { CONSENT_SCOPES, DATA_CATEGORIES, type DataCategory } from '@/model/policies/consentScopes';
import type { ConsentPurpose, Id } from '@/model/types';
import { useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import { unwrap } from '@/test/result';
import {
  addWasher,
  caseAfterFinding,
  consentsFor,
  escapeRegExp,
  flush,
  photoCase,
  start,
  tap,
} from '@/test/regressions';

const insurer = demoConfig.insurer.shortName;

/** Woran man eine Kategorie in der Karte „Fallakte“ erkennt */
const cardMarkers: Partial<Record<DataCategory, string | RegExp>> = {
  vertrag: de.costs.previewContract(demoConfig.contract.number),
  geraet: de.help.facts.device,
  problem: de.help.facts.problem,
  ergebnis: de.help.facts.result,
  nachrichten: de.chat.fileTitle,
  schritte: de.help.facts.steps,
  notiz: new RegExp(escapeRegExp(de.a11y.fact(de.help.facts.note, ''))),
  fotos: de.caseFile.photos,
  befund: de.caseFile.finding,
  kosten: de.caseFile.costs,
};

/** Kategorien, die die Karte auf dem Screen gerade zeigt */
function cardCategories(): DataCategory[] {
  const card = within(screen.getByTestId(CASE_FILE_CARD));
  return DATA_CATEGORIES.filter((key) => {
    const marker = cardMarkers[key];
    return marker !== undefined && card.queryAllByText(marker).length > 0;
  });
}

/** Die Liste „· …“ zeigt genau die Kategorien des Zwecks, keine andere */
function expectItems(purpose: ConsentPurpose) {
  const scope = CONSENT_SCOPES[purpose].dataCategories;
  for (const key of DATA_CATEGORIES) {
    const shown = screen.queryAllByText(de.help.item(de.dataCategory[key])).length > 0;
    expect([key, shown]).toEqual([key, scope.includes(key)]);
  }
}

/** Die gespeicherte Bestätigung trägt genau den Umfang aus CONSENT_SCOPES */
function expectStored(purpose: ConsentPurpose, text: LegalTextKey, caseId?: Id) {
  const consent = consentsFor(purpose, caseId).at(-1);
  const scope = CONSENT_SCOPES[purpose];
  expect(consent).toMatchObject({
    legalBasis: scope.legalBasis,
    recipient: { kind: scope.recipientKind },
    dataCategories: [...scope.dataCategories],
    // Version und Hash des Texts, der vor dem Tap stand (lib/legalTexts.ts)
    ...textStamp(text),
  });
  return consent!;
}

/** Jeder Teil des versionierten Texts steht auf dem Screen */
function expectShown(text: LegalTextKey) {
  for (const part of legalParts(text)) {
    expect([part, screen.queryAllByText(part).length > 0]).toEqual([part, true]);
  }
}

/** Fall mit allem: Foto und Ergebnis, Chat, Anleitung bis „Geht nicht“ mit Notiz, optional Befund */
function fullCase({ finding }: { finding: boolean }): Id {
  start();
  const id = photoCase(addWasher().id);
  const s = useAppStore.getState();
  s.addChatMessage({ caseId: id, role: 'haushalt', text: 'Es steht Wasser in der Trommel.' });
  const run = unwrap(s.startGuide(id, 'ablauf'));
  for (let i = 0; i < 4; i++) s.moveGuideStep(run.id, 'next');
  s.finishGuide(run.id, 'geht_nicht', 'Pumpenflügel klemmt');
  if (finding) s.setFinding(id, 'reparatur', 'fachkraft');
  return id;
}

const fetchMock = jest.fn();
const realFetch = global.fetch;
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ reply: 'Steht Wasser drin?', suggestion: 'keine', guideId: '' }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterAll(() => {
  global.fetch = realFetch;
});

/** Jedes Feld, das an den Assistenten geht, und seine Kategorie. tsc prüft, dass keins fehlt. */
const contextCategory: Record<keyof ChatContext, DataCategory> = {
  category: 'geraet',
  manufacturerId: 'geraet',
  model: 'geraet',
  problem: 'problem',
  errorPattern: 'ergebnis',
  displayMessage: 'ergebnis',
  guide: 'schritte',
  hasProtection: 'schutz',
};

/** Je Zweck die Wege, auf denen die App ihn bestätigen lässt. tsc prüft, dass keiner fehlt. */
const flows: Record<ConsentPurpose, Record<string, () => Promise<void> | void>> = {
  weitergabe_versicherer: {
    'Kosten: „Das geht an …“ zeigt genau, was gespeichert wird': async () => {
      const id = fullCase({ finding: true });
      await renderRouter(APP, { initialUrl: `/fall/${id}/kosten` });
      await tap(de.costs.preview(insurer));
      const shown = cardCategories();
      expectShown('schadenmeldung');
      await tap(de.costs.report);
      const consent = expectStored('weitergabe_versicherer', 'schadenmeldung', id);
      expect(shown).toEqual(consent.dataCategories);
    },
    'Gespräch: dieselbe Vorschau': async () => {
      const id = fullCase({ finding: true });
      await renderRouter(APP, { initialUrl: `/fall/${id}` });
      await tap(de.costs.preview(insurer));
      const shown = cardCategories();
      expectShown('schadenmeldung');
      await tap(de.costs.report);
      await flush();
      const consent = expectStored('weitergabe_versicherer', 'schadenmeldung', id);
      expect(shown).toEqual(consent.dataCategories);
    },
    'Profil: die Weitergabe nennt ihre gespeicherten Kategorien': async () => {
      start();
      const id = caseAfterFinding(addWasher().id);
      useAppStore.getState().reportClaim(id);
      const consent = expectStored('weitergabe_versicherer', 'schadenmeldung', id);
      await renderRouter(APP, { initialUrl: '/profil' });
      expect(screen.getByText(de.common.list(categoryLabels(consent.dataCategories)))).toBeTruthy();
    },
  },
  weitergabe_fachkraft: {
    'vor dem Videocall: Karte und Liste zeigen, was gespeichert wird': async () => {
      const id = fullCase({ finding: false });
      await renderRouter(APP, { initialUrl: `/fall/${id}` });
      const shown = cardCategories();
      expectItems('weitergabe_fachkraft');
      expectShown('fachkraft_videocall');
      await tap(new RegExp(`^${de.thread.callStart}`));
      await flush();
      const consent = expectStored('weitergabe_fachkraft', 'fachkraft_videocall', id);
      expect(shown).toEqual(consent.dataCategories);
    },
    'vor dem Rückruf: dieselbe Liste im Sheet': async () => {
      const id = fullCase({ finding: false });
      useAppStore.getState().setDemo({ videoScenario: 'keine_fachkraft' });
      await renderRouter(APP, { initialUrl: `/fall/${id}` });
      await tap(new RegExp(`^${de.thread.callStart}`));
      await flush();
      const before = consentsFor('weitergabe_fachkraft', id).length;
      await tap(de.waiting.callbackSlots[0]!);
      expectItems('weitergabe_fachkraft');
      expectShown('fachkraft_rueckruf');
      await tap(de.waiting.requestCallback);
      expect(consentsFor('weitergabe_fachkraft', id)).toHaveLength(before + 1);
      expectStored('weitergabe_fachkraft', 'fachkraft_rueckruf', id);
    },
  },
  screenshots_im_call: {
    'der Satz unter dem Kästchen nennt genau die gespeicherten Kategorien': async () => {
      const id = fullCase({ finding: false });
      await renderRouter(APP, { initialUrl: `/fall/${id}` });
      const sub = de.help.screenshotsSub(de.common.list(scopeLabels('screenshots_im_call')));
      expect(screen.getByText(sub)).toBeTruthy();
      expectShown('screenshots');
      await fireEvent.press(screen.getByRole('checkbox', { name: de.help.screenshots }));
      await tap(new RegExp(`^${de.thread.callStart}`));
      await flush();
      const consent = expectStored('screenshots_im_call', 'screenshots', id);
      expect(de.help.screenshotsSub(de.common.list(categoryLabels(consent.dataCategories)))).toBe(
        sub,
      );
    },
  },
  weitergabe_betrieb: {
    'Termin: der Satz nennt genau die gespeicherten Kategorien': async () => {
      start();
      const id = caseAfterFinding(addWasher().id);
      await renderRouter(APP, { initialUrl: `/fall/${id}/kosten` });
      await tap(de.costs.report);
      const shares = de.appointment.shares(de.common.list(scopeLabels('weitergabe_betrieb')));
      expect(screen.getByText(shares)).toBeTruthy();
      expectShown('termin_betrieb');
      await fireEvent.press(screen.getByRole('radio', { name: demoConfig.slots[0] }));
      await tap(de.appointment.request);
      const consent = expectStored('weitergabe_betrieb', 'termin_betrieb', id);
      expect(de.appointment.shares(de.common.list(categoryLabels(consent.dataCategories)))).toBe(
        shares,
      );
    },
  },
  hersteller_einzelfall: {
    'Profil: der Satz nennt genau die gespeicherten Kategorien': async () => {
      start();
      await renderRouter(APP, { initialUrl: '/profil' });
      const sub = de.profile.manufacturerCaseSub(
        de.common.list(scopeLabels('hersteller_einzelfall')),
      );
      expect(screen.getByText(sub)).toBeTruthy();
      expectShown('hersteller_einzelfall');
      await fireEvent.press(
        screen.getByRole('checkbox', {
          name: de.profile.manufacturerCase(demoConfig.manufacturer.name),
        }),
      );
      const consent = expectStored('hersteller_einzelfall', 'hersteller_einzelfall');
      expect(consent.caseId).toBeUndefined();
      expect(
        de.profile.manufacturerCaseSub(de.common.list(categoryLabels(consent.dataCategories))),
      ).toBe(sub);
    },
  },
  mitteilungen: {
    'ohne Vorschau, die Daten verlassen das Telefon nicht': async () => {
      start();
      await renderRouter(APP, { initialUrl: '/profil' });
      expectShown('mitteilungen');
      await act(async () => useAppStore.getState().setNotifications('erlaubt'));
      expect(expectStored('mitteilungen', 'mitteilungen').caseId).toBeUndefined();
    },
  },
  chat_assistent: {
    'die Liste vor der Einwilligung zeigt genau, was gespeichert wird': async () => {
      start();
      const c = useAppStore
        .getState()
        .createCase({ deviceId: addWasher().id, entry: 'freitext', problemLabel: 'Pumpe' });
      await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
      await fireEvent.changeText(screen.getByLabelText(de.thread.inputLabel), 'Es pumpt nicht ab.');
      await tap(de.chat.send);
      expectItems('chat_assistent');
      expectShown('assistent_einwilligung');
      await tap(de.chat.consentAccept);
      await flush();
      expectStored('chat_assistent', 'assistent_einwilligung');
    },
    'was lib/chat/context.ts mitschickt, steht in der Einwilligung': () => {
      const id = fullCase({ finding: false });
      const context = chatContext(useAppStore.getState(), id)!;
      const scope = CONSENT_SCOPES.chat_assistent.dataCategories;
      expect(scope).toContain('nachrichten');
      for (const field of Object.keys(context) as (keyof ChatContext)[]) {
        expect([field, scope.includes(contextCategory[field])]).toEqual([field, true]);
      }
    },
  },
};

describe.each(Object.entries(flows))('Vorschau und Bestätigung: %s', (_, cases) => {
  test.each(Object.entries(cases))('%s', (__, run) => run());
});
