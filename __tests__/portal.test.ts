/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';

import * as ts from 'typescript';

import { fruendSettings, messagePreview, portalSeed } from '@/config/portal.demo';
import { de } from '@/i18n/de';
import { fillTemplate, formatOptions, parseOptions, settingsSections } from '@/model/portal';
import type { SharedPhoto } from '@/model/sharing';
import { PURCHASE_WARRANTY_MONTHS, fullMonths, warrantyCheck } from '@/portal/lib/check';
import { DEFAULT_REGULATOR_RULES } from '@/model/policies/regulator';
import { conversation } from '@/portal/lib/conversation';
import { nextStep } from '@/portal/lib/next';
import { photoLabel } from '@/portal/lib/photos';
import { sectionFromForm } from '@/portal/lib/settingsForm';
import { sla } from '@/portal/lib/sla';
import { computeStats } from '@/portal/lib/stats';
import { unread } from '@/portal/lib/view';
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
