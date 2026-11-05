/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';

import * as ts from 'typescript';

import { demoConfig } from '@/config/demo.config';
import { fruendSettings, messagePreview, portalSeed } from '@/config/portal.demo';
import { catalog } from '@/data/catalog';
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import { getGuide } from '@/lib/guideCatalog';
import {
  fillTemplate,
  formatOptions,
  inServiceHours,
  parseOptions,
  settingsSections,
} from '@/model/portal';
import type { SharedPhoto } from '@/model/sharing';
import {
  PURCHASE_WARRANTY_MONTHS,
  allowedDecisions,
  fullMonths,
  warrantyCheck,
} from '@/portal/lib/check';
import { DEFAULT_REGULATOR_RULES } from '@/model/policies/regulator';
import { conversation } from '@/portal/lib/conversation';
import { nextStep } from '@/portal/lib/next';
import { photoLabel } from '@/portal/lib/photos';
import { sectionFromForm } from '@/portal/lib/settingsForm';
import { sla } from '@/portal/lib/sla';
import { computeStats } from '@/portal/lib/stats';
import { decisionOf, lastMessage, unread } from '@/portal/lib/view';
import { seedAnonymous, seedRecords } from '@/server/backend/seed';
import { parseSettingsSection } from '@/server/backend/validate';

const NOW = Date.parse('2026-11-06T09:00:00Z');
const H = 3_600_000;
const records = seedRecords(NOW);
const s = fruendSettings;

describe('Händlerportal: Logik', () => {
  test('Fristenampel: neu nach 4 Stunden überfällig, knapp in der letzten Stunde', () => {
    const r = records.find((x) => x.workflow?.status === 'neu')!;
    const at = (h: number) =>
      sla(
        { ...r, file: { ...r.file, sharedAt: new Date(NOW - h * H).toISOString() } },
        s.rules,
        NOW,
      );
    expect(at(1)?.tone).toBe('ok');
    expect(at(3.5)?.tone).toBe('warn');
    expect(at(6)).toMatchObject({ tone: 'over', label: '2 Std. überfällig' });
    const done = records.find((x) => x.workflow?.status === 'erledigt')!;
    expect(sla(done, s.rules, NOW)).toBeNull();
  });

  test('Gewährleistungsprüfung: Alter, Versicherung, Kulanz, Kaufbeleg', () => {
    const base = records[0]!.file;
    const asOf = '2026-11-05T10:00:00.000Z';
    const bought = (purchaseDate: string | undefined) => ({
      ...base,
      case: { ...base.case, createdAt: asOf },
      device: { ...base.device, purchaseDate },
      quote: undefined,
      protection: undefined,
      photos: [],
    });
    expect(warrantyCheck(bought('2025-06-14T00:00:00+02:00'), s.rules)).toMatchObject({
      verdict: 'gewaehrleistung',
      months: 16,
      until: '2027-06-14T21:59:59.999Z',
    });
    // 27 und 40 Monate: Kulanz innerhalb der Regel des Händlers, danach abgelaufen
    expect(warrantyCheck(bought('2024-08-05T12:00:00+02:00'), s.rules).verdict).toBe('kulanz');
    expect(warrantyCheck(bought('2023-07-05T12:00:00+02:00'), s.rules).verdict).toBe('abgelehnt');
    const insured = (validUntil: string) => ({
      ...bought('2023-07-05T12:00:00+02:00'),
      protection: { provider: 'X', product: 'Y', validUntil },
    });
    expect(warrantyCheck(insured('2027-01-01T00:00:00Z'), s.rules).verdict).toBe('an_versicherer');
    // Abgelaufene Versicherung: kein Verweis auf sie
    expect(warrantyCheck(insured('2026-01-01T00:00:00Z'), s.rules).verdict).toBe('abgelehnt');
    // Was die Regel zulässt, gleich mit der App: in der Frist keine Kulanz, danach keine
    // Gewährleistung, Versicherung nur mit gültigem Vertrag, Ablehnen immer
    const allowed = (file: Parameters<typeof warrantyCheck>[0]) =>
      allowedDecisions(warrantyCheck(file, s.rules));
    expect(allowed(bought('2025-06-14T00:00:00+02:00'))).toEqual(['gewaehrleistung', 'abgelehnt']);
    expect(allowed(bought('2024-08-05T12:00:00+02:00'))).toEqual(['kulanz', 'abgelehnt']);
    expect(allowed(insured('2027-01-01T00:00:00Z'))).toEqual([
      'kulanz',
      'an_versicherer',
      'abgelehnt',
    ]);
    expect(
      allowed({
        ...bought('2025-06-14T00:00:00+02:00'),
        device: { ...base.device, purchaseDate: undefined },
      }),
    ).toEqual(['gewaehrleistung', 'kulanz', 'abgelehnt']);
    // Versicherung vor Kulanz (U10)
    expect(
      warrantyCheck(
        {
          ...bought('2024-08-05T12:00:00+02:00'),
          protection: { provider: 'X', product: 'Y', validUntil: '2027-01-01T00:00:00Z' },
        },
        s.rules,
      ).verdict,
    ).toBe('an_versicherer');
    const photo = { id: 'p', takenAt: asOf, purpose: 'frage' as const, source: 'demo' as const };
    expect(
      warrantyCheck(
        { ...bought(undefined), photos: [{ ...photo, purpose: 'kaufbeleg' as const }] },
        s.rules,
      ).proof,
    ).toBe(true);
    // Ein Foto aus dem Chat zählt, sobald das Team es als Kaufbeleg markiert
    const chat = { ...bought(undefined), photos: [photo] };
    expect(warrantyCheck(chat, s.rules).proof).toBe(false);
    expect(warrantyCheck(chat, s.rules, { proofPhotoId: 'p' }).proof).toBe(true);
    expect(warrantyCheck(chat, s.rules, { proofPhotoId: 'anderes' }).proof).toBe(false);
  });

  // Portal-Prüfung 05.11.: Ohne Kaufdatum schlug das Portal „Abgelaufen“ und „Ablehnen“ vor,
  // die App sagt zum selben Fall „Fründ prüft“.
  test('ohne Kaufdatum: kein Vorschlag, also kein „Ablehnen“ als nächster Schritt', () => {
    const neu = records.find((x) => x.workflow?.status === 'neu')!;
    const file = { ...neu.file, device: { ...neu.file.device, purchaseDate: undefined } };
    const r = { ...neu, file, workflow: { ...neu.workflow!, status: 'wartet_uns' as const } };
    expect(warrantyCheck(file, s.rules)).toMatchObject({ verdict: 'offen' });
    expect(warrantyCheck(file, s.rules).months).toBeUndefined();
    expect(nextStep(r, s)).toEqual({ kind: 'entscheiden', decision: 'offen' });
    expect(
      warrantyCheck({ ...file, device: { ...file.device, purchaseDate: 'kaputt' } }, s.rules)
        .verdict,
    ).toBe('offen');
  });

  // Gleich mit der App (model/policies/regulator.ts): Kalendermonate, Ende des Tages in Berlin
  test('Frist wie in der App: am letzten Tag noch, am Tag danach nicht mehr', () => {
    const base = records[0]!.file;
    const at = (createdAt: string) => ({
      ...base,
      case: { ...base.case, createdAt },
      device: { ...base.device, purchaseDate: '2024-02-01T09:00:00+01:00' },
      quote: undefined,
      protection: undefined,
    });
    // Mit 30,44-Tage-Monaten war das schon Kulanz
    expect(warrantyCheck(at('2026-02-01T10:00:00+01:00'), s.rules).verdict).toBe('gewaehrleistung');
    expect(warrantyCheck(at('2026-02-01T23:59:59+01:00'), s.rules).verdict).toBe('gewaehrleistung');
    expect(warrantyCheck(at('2026-02-02T00:00:00+01:00'), s.rules).verdict).toBe('kulanz');
    expect(PURCHASE_WARRANTY_MONTHS).toBe(DEFAULT_REGULATOR_RULES.purchaseWarrantyMonths);
    expect(fullMonths('2024-02-01T09:00:00+01:00', '2026-02-01T10:00:00+01:00')).toBe(24);
    expect(fullMonths('2024-02-01T09:00:00+01:00', '2026-02-02T10:00:00+01:00')).toBe(24);
    expect(fullMonths('2024-02-01T09:00:00+01:00', '2026-01-31T10:00:00+01:00')).toBe(23);
  });

  test('Als Nächstes: annehmen, entscheiden, Termin steht, abgebrochen', () => {
    const neu = records.find((x) => x.workflow?.status === 'neu')!;
    expect(nextStep(neu, s)?.kind).toBe('annehmen');
    // Termin: kein großer „Fall abschließen“-Knopf vor der Reparatur
    const termin = records.find((x) => x.workflow?.status === 'termin')!;
    expect(nextStep(termin, s)?.kind).toBe('termin_steht');
    const undecided = { ...neu, workflow: { ...neu.workflow!, status: 'wartet_uns' as const } };
    expect(nextStep(undecided, s)?.kind).toBe('entscheiden');
    // In der App abgebrochen (Nr. 34)
    const cancelled = {
      ...undecided,
      file: { ...undecided.file, case: { ...undecided.file.case, status: 'abgebrochen' as const } },
    };
    expect(nextStep(cancelled, s)).toEqual({ kind: 'abgebrochen' });
  });

  test('Gespräch: Kundschaft, Händler wie in der App, Notizen, Systemzeilen zusammengefasst', () => {
    const r = records.find((x) => (x.notes?.length ?? 0) > 0 && x.file.answers.length)!;
    const items = conversation(r);
    expect(items.some((x) => x.kind === 'note')).toBe(true);
    expect(items.some((x) => x.kind === 'customer' && x.answer)).toBe(true);
    const greeting = items.find((x) => x.kind === 'dealer' && x.auto);
    expect(greeting).toMatchObject({ kind: 'dealer', contact: true });
    // Keine zwei Systemblöcke direkt hintereinander
    items.forEach((x, i) => {
      if (i > 0) expect(x.kind === 'system' && items[i - 1]!.kind === 'system').toBe(false);
    });
  });

  test('Gespräch: Kulanz mit Betrag steht wie in der App, Kurzname aus den Einstellungen', () => {
    const r = records.find((x) => x.retailerEvents.length > 0)!;
    const e = {
      ...r.retailerEvents[0]!,
      id: 'kulanz-betrag',
      type: 'haendler_entscheidung' as const,
      payload: { decision: 'kulanz', coverCents: 18000, totalCents: 24400 },
    };
    const text = conversation({ ...r, retailerEvents: [e] }, 'Fründ').find(
      (x) => x.kind === 'dealer',
    );
    expect(text).toMatchObject({
      text: `${de.sharing.decision.kulanz}\n${de.sharing.goodwill.split('Fründ', formatEuro(18000), formatEuro(6400))}`,
    });
  });

  // Im Browser gefunden (Portal-Rundgang 05.11.): Was der Händler tat, kam mit dem Abgleich als
  // Systemzeile zurück und stand vor seiner eigenen Nachricht noch einmal.
  test('Gespräch: eigene Nachrichten des Händlers stehen nicht noch einmal als Systemzeile', () => {
    const r = records.find((x) => x.retailerEvents.length > 0)!;
    const echo = r.retailerEvents.map((e) => ({
      type: e.type,
      at: e.at,
      label: `Echo ${e.id}`,
      actor: 'haendler',
    }));
    const withEcho = { ...r, file: { ...r.file, timeline: [...r.file.timeline, ...echo] } };
    const texts = conversation(withEcho)
      .filter((x) => x.kind === 'system')
      .flatMap((x) => (x.kind === 'system' ? x.texts.map((t) => t.text) : []));
    for (const e of echo) expect(texts).not.toContain(e.label);
    expect(conversation(withEcho).filter((x) => x.kind === 'dealer')).toHaveLength(
      r.retailerEvents.length,
    );
  });

  // Prüfung 1.1: In der App ist ein Foto für den Händler ein Foto zu einer Frage. Im Portal hieß es
  // darum „Frage an den Assistenten“, obwohl es an den Händler ging.
  test('Fotos: ein Foto zu einer Nachricht heißt nicht nach dem Assistenten', () => {
    const at = '2026-11-04T15:59:00.000Z';
    const sent: SharedPhoto = { id: 'ph_msg', takenAt: at, purpose: 'frage', source: 'demo' };
    const plate: SharedPhoto = {
      id: 'ph_tsl',
      takenAt: at,
      purpose: 'typenschild',
      source: 'demo',
    };
    const file = {
      messages: [{ id: 'm_1', at, text: 'Hier das Typenschild', photoId: sent.id }],
    };
    expect(photoLabel(file, sent)).toBe(de.portal.file.photoMessage);
    expect(photoLabel(file, plate)).toBe(de.caseFile.photoPurpose.typenschild);
    // Auch ohne Verweis aus einer Nachricht nie der Assistent
    expect(photoLabel({}, sent)).toBe(de.portal.file.photoMessage);
    const labels = [sent, plate].map((p) => photoLabel(file, p));
    for (const label of labels) {
      expect(label).not.toContain(de.caseFile.photoPurpose.frage);
      expect(label).not.toMatch(/Assistent/);
    }
  });

  test('Ungelesen nur, wenn die Kundschaft nach dem letzten Öffnen schrieb', () => {
    const waiting = records.filter((x) => x.workflow?.status === 'wartet_uns');
    expect(waiting.some(unread)).toBe(true);
    expect(records.filter((x) => x.workflow?.status === 'erledigt').some(unread)).toBe(false);
  });

  test('Auswertung aus den Beispielfällen: zwölf Wochen, Anteil, Ersparnis, Sterne', () => {
    const st = computeStats(records, seedAnonymous(NOW).fruend!, s, NOW);
    expect(st.weeks).toHaveLength(12);
    expect(st.weeks.reduce((a, w) => a + w.total, 0)).toBe(st.total);
    expect(st.selfShare).toBeGreaterThan(0.3);
    expect(st.savedCents).toBe(
      st.visits * s.service.savings.visitCents + st.returns * s.service.savings.returnCents,
    );
    expect(st.ratingAvg).toBeGreaterThanOrEqual(3);
    expect(st.top[0]!.count).toBeGreaterThanOrEqual(st.top.at(-1)!.count);
  });

  // Im Portal-Rundgang gefunden: Ein Komma trennte Antworten, „Ja, ich schicke ein Foto“ zerfiel
  // beim Speichern und in der Rückfrage in „Ja“ und „ich schicke ein Foto“.
  test('Antworten auf Rückfragen: eine pro Zeile, ein Komma bleibt in der Antwort', () => {
    const beleg = fruendSettings.messages.questions.find((q) => q.id === 'beleg')!;
    expect(beleg.options.some((o) => o.includes(','))).toBe(true);
    expect(parseOptions(formatOptions(beleg.options))).toEqual(beleg.options);
    expect(parseOptions('Ja, ich schicke ein Foto\r\n\n Nein \nA\nB\nC')).toEqual([
      'Ja, ich schicke ein Foto',
      'Nein',
      'A',
      'B',
    ]);
    // Speichern ohne Änderung lässt die Antworten, wie sie sind
    const form = new FormData();
    form.set('question.0.id', beleg.id);
    form.set('question.0.question', beleg.question);
    form.set('question.0.options', formatOptions(beleg.options));
    const saved = sectionFromForm('messages', form, fruendSettings) as {
      questions: { options: string[] }[];
    };
    expect(saved.questions[0]!.options).toEqual(beleg.options);
  });

  test('Einstellungen: jedes Formular ergibt einen gültigen Abschnitt', () => {
    const form = new FormData();
    // Profil
    form.set('name', 'Fründ Elektrogeräte AG');
    form.set('shortName', 'Fründ');
    form.set('email', 'service@fruend.example');
    form.set('phone', '05732 000 00-0');
    form.set('website', 'fruend.example');
    form.append('days', '1');
    form.append('days', '2');
    form.set('from', '09:00');
    form.set('to', '17:00');
    form.set('branch.0.name', 'Löhne');
    form.set('branch.0.id', 'loehne');
    form.set('branch.1.name', 'Herford');
    form.set('branch.1.city', 'Herford');
    const profile = parseSettingsSection('profile', sectionFromForm('profile', form, s), s);
    expect(profile?.profile.hours).toEqual({ days: [1, 2], from: '09:00', to: '17:00' });
    expect(profile?.profile.branches.map((b) => b.id)).toEqual(['loehne', 'herford']);

    for (const section of settingsSections) {
      const f = new FormData();
      if (section === 'integrations') {
        f.set('key', 'whatsapp');
        f.set('value', 'verbunden');
      }
      if (section === 'team') {
        f.set('member.0.name', 'Neu N.');
        f.set('member.0.role', 'technik');
        f.set('member.0.active', 'on');
      }
      expect(parseSettingsSection(section, sectionFromForm(section, f, s), s)).not.toBeNull();
    }
    const rules = new FormData();
    rules.set('goodwillMax', '200,50');
    rules.set('autoAccept', 'on');
    const parsed = parseSettingsSection('rules', sectionFromForm('rules', rules, s), s);
    expect(parsed?.rules).toMatchObject({
      goodwillMaxCents: 20050,
      autoAccept: true,
      requestProof: false,
    });
  });
});

// Im Portal-Build gefunden (05.11.): Die Fehlerseite läuft im Browser und lud die Wortmarke, die
// ihre Datei mit node:fs liest. Der Build brach ab, tsc und jest merkten nichts.
describe('Händlerportal: Browser-Komponenten ohne Server-Code', () => {
  const root = path.join(__dirname, '..', 'portal');
  const files = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
      .flatMap((e) =>
        e.isDirectory()
          ? files(path.join(dir, e.name))
          : /\.tsx?$/.test(e.name)
            ? [path.join(dir, e.name)]
            : [],
      );
  const client = ['app', 'components']
    .flatMap((d) => files(path.join(root, d)))
    .filter((f) => /^['"]use client['"]/.test(fs.readFileSync(f, 'utf8').trimStart()));

  test('es gibt Browser-Komponenten', () => {
    expect(client.length).toBeGreaterThan(3);
  });

  test.each(client.map((f) => [path.relative(root, f), f]))(
    '%s lädt kein node:* und keine Wortmarke',
    (_, f) => {
      const src = fs.readFileSync(f, 'utf8');
      expect(src).not.toMatch(/from ['"]node:/);
      expect(src).not.toMatch(/from ['"][^'"]*Wordmark['"]/);
    },
  );
});

// Im Portal gesehen (05.11.2026): Zwei Zeilen oben in der Liste endeten mit derselben Nachricht
// „Dienstag passt gut …“, ohne Terminvorschlag davor. Und die letzte Woche der Auswertung war fast
// doppelt so hoch wie die anderen, weil alle offenen Beispielfälle in den letzten Tagen lagen.
describe('Beispielfälle: wie echte Fälle', () => {
  const open = records.filter((r) => r.workflow?.status !== 'erledigt');
  const beleg = s.messages.questions.find((q) => q.id === 'beleg')!;
  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  test('Die ersten offenen Fälle der Liste zeigen verschiedene letzte Nachrichten', () => {
    // Sortiert wie die Arbeitsliste: Fristen zuerst, dann die neuesten
    const left = (r: (typeof records)[number]) => sla(r, s.rules, NOW)?.left ?? Infinity;
    const list = [...open].sort(
      (a, b) => left(a) - left(b) || b.file.sharedAt.localeCompare(a.file.sharedAt),
    );
    const previews = list.slice(0, 15).flatMap((r) => lastMessage(r)?.text ?? []);
    expect(previews.length).toBeGreaterThanOrEqual(12);
    expect(new Set(previews).size).toBe(previews.length);
    expect(new Set(open.map((r) => r.file.customer.name)).size).toBe(open.length);
  });

  test('Antworten nur auf Fragen, ein Wochentag erst nach dem Terminvorschlag', () => {
    for (const r of records) {
      for (const a of r.file.answers) {
        const q = r.retailerEvents.find((e) => e.id === a.questionEventId);
        expect(q && q.at <= a.at).toBe(true);
        expect((q?.payload.options ?? q?.payload.slots) as string[]).toContain(a.answer);
      }
      for (const m of r.file.messages ?? []) {
        const day = days.find((d) => m.text.includes(d));
        if (!day) continue;
        const before = r.retailerEvents.filter((e) => e.at < m.at);
        expect(before.some((e) => e.type === 'haendler_termin')).toBe(true);
        const booked = before.findLast((e) => e.type === 'haendler_betrieb' && e.payload.slot);
        if (booked) expect(String(booked.payload.slot).slice(0, 2)).toBe(day.slice(0, 2));
      }
    }
  });

  test('Kaufbeleg: Die Frage kommt nur ohne Beleg, die Antwort passt zum Foto', () => {
    for (const r of records) {
      const asked = r.retailerEvents.find((e) => e.payload.question === beleg.question);
      const proof = r.file.photos.some((p) => p.purpose === 'kaufbeleg');
      const answer = r.file.answers.find((a) => a.questionEventId === asked?.id)?.answer;
      expect(proof).toBe(!asked || answer === beleg.options[0]);
      if ((r.file.messages ?? []).some((m) => m.text.includes('Beleg'))) expect(proof).toBe(false);
      // Beispielfotos haben kein Bild: nur der Kaufbeleg, keine leere Kachel „Display“
      expect(r.file.photos.every((p) => p.purpose === 'kaufbeleg')).toBe(true);
    }
  });

  test('Der Stand passt zum Gespräch', () => {
    for (const r of open) {
      const wf = r.workflow!;
      const own = r.retailerEvents.filter((e) => !e.payload.auto);
      if (wf.status === 'neu') expect(own).toEqual([]);
      else expect(own[0]?.type).toBe('haendler_angenommen');
      if (wf.status === 'wartet_uns') expect(lastMessage(r)?.fromCustomer).toBe(true);
      if (wf.status === 'wartet_kunde') expect(own.at(-1)!.at > wf.lastCustomerAt!).toBe(true);
      if (wf.status === 'termin') {
        expect(decisionOf(r)).toBeDefined();
        expect(r.retailerEvents.some((e) => e.type === 'haendler_betrieb' && e.payload.slot)).toBe(
          true,
        );
      }
    }
  });

  test('Fründ handelt in den Öffnungszeiten, zu jeder Uhrzeit des Starts', () => {
    // Freitag 10 Uhr, Sonntag 21:30 Uhr, Montag 7:30 Uhr
    for (const now of [
      NOW,
      Date.parse('2026-11-08T20:30:00Z'),
      Date.parse('2026-11-09T06:30:00Z'),
    ]) {
      const late: string[] = [];
      for (const r of seedRecords(now)) {
        for (const e of r.retailerEvents)
          if (!e.payload.auto && !inServiceHours(s.profile.hours, new Date(e.at)))
            late.push(`${r.file.caseId} ${e.type} ${e.at}`);
        for (const n of r.notes ?? [])
          if (!inServiceHours(s.profile.hours, new Date(n.at)))
            late.push(`${r.file.caseId} ${n.at}`);
      }
      expect(late).toEqual([]);
    }
  });

  test('Neue Beispielfälle sehen nicht aus wie der Fall aus der Live-Demo, Nummern darunter', () => {
    const live = catalog.find((m) => m.id === demoConfig.dealerDemo.catalogId)!;
    const drain = getGuide(live.patterns.ablauf)!.title;
    expect(
      open.filter(
        (r) => r.file.device.model === live.model && /Wasser/.test(r.file.case.problemLabel),
      ),
    ).toEqual([]);
    expect(open.some((r) => r.file.case.problemLabel === drain)).toBe(false);
    for (const r of records)
      expect(Number(r.file.caseId.replace(/\D/g, ''))).toBeLessThan(demoConfig.caseNumber.start);
  });

  test('Auswertung: Die letzte Woche sticht nicht heraus', () => {
    const st = computeStats(records, seedAnonymous(NOW).fruend!, s, NOW);
    const totals = st.weeks.map((w) => w.total);
    const before = totals.slice(0, -1);
    const last = st.weeks.at(-1)!;
    expect(last.total).toBeLessThanOrEqual(Math.max(...before));
    expect(last.counts.haendler / last.total).toBeLessThan(0.5);
    // Etwa so viele Fälle wie vorher, gut die Hälfte ohne Einsatz gelöst
    expect(st.total).toBeGreaterThanOrEqual(190);
    expect(st.total).toBeLessThanOrEqual(230);
    expect(st.selfShare).toBeGreaterThan(0.45);
  });
});

describe('Händlerportal: erfundene Werte', () => {
  // Fiktive Namen und Nummern stehen in config/portal.demo.ts (CLAUDE.md), nicht im Code des Portals
  const dir = path.resolve(__dirname, '..', 'portal');
  const files = ['app', 'components', 'lib'].flatMap((sub) =>
    fs
      .readdirSync(path.join(dir, sub), { recursive: true, encoding: 'utf8' })
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => path.join(sub, f)),
  );
  const people = [...portalSeed.customers, ...s.team.map((m) => m.name), messagePreview.customer];
  const firstNames = [...new Set(people.map((n) => n.split(' ')[0]!))];
  const invented = new RegExp(`\\b(?:${firstNames.join('|')})\\b|\\bGS-\\d`);

  /**
   * Text im Code: Strings, Template-Strings und JSX-Text, gelesen mit dem Parser von TypeScript.
   * Ein Name zählt überall im Text, nicht nur am Anfang. Kommentare und Bezeichner zählen nicht.
   */
  function inventedTexts(file: string, code: string): string[] {
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
    const hits: string[] = [];
    const visit = (node: ts.Node) => {
      if (
        ts.isStringLiteralLike(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node) ||
        ts.isJsxText(node)
      ) {
        if (invented.test(node.text)) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          hits.push(`${file}:${line + 1}: ${node.text.trim()}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return hits;
  }

  test('die Suche findet Namen und Fallnummern auch mitten im Text', () => {
    const probe = [
      "const a = { kunde: 'Robin', fall: 'GS-24816' };",
      "const b = { kunde: 'Kundin Robin', fall: 'Fall GS-24816' };",
      'const c = `Fall GS-24816 für ${name}`;',
      'const d = `Hallo ${name}, hier ist Sandra`;',
      'const e = <legend>{t.messages.templates} Robin GS-24816</legend>;',
      'const f = <Feld label="Ansprechpartner Markus" />;',
      '// Robin und GS-24816 im Kommentar zählen nicht',
      'const Robinson = robin;',
    ].join('\n');
    expect(inventedTexts('probe.tsx', probe).map((h) => Number(h.split(':')[1]))).toEqual([
      1, 1, 2, 2, 3, 4, 5, 6,
    ]);
  });

  test('kein Vorname aus der Demo und keine Fallnummer als Text im Code', () => {
    const hits = files.flatMap((f) => inventedTexts(f, fs.readFileSync(path.join(dir, f), 'utf8')));
    expect(files.length).toBeGreaterThan(20);
    expect(firstNames).toEqual(expect.arrayContaining(['Robin', 'Sandra', 'Markus']));
    expect(hits).toEqual([]);
  });

  test('Vorschau unter Einstellungen → Nachrichten füllt Kunde und Fall aus der Konfiguration', () => {
    expect(
      fillTemplate('Hallo {kunde}, Fall {fall}', {
        kunde: messagePreview.customer,
        fall: messagePreview.caseNumber,
      }),
    ).toBe('Hallo Robin, Fall GS-24816');
  });
});
