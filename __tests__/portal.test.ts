/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';

import * as ts from 'typescript';

import { fruendSettings, messagePreview, portalSeed } from '@/config/portal.demo';
import { de } from '@/i18n/de';
import { fillTemplate, settingsSections } from '@/model/portal';
import type { SharedPhoto } from '@/model/sharing';
import { warrantyCheck } from '@/portal/lib/check';
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

  test('Gewährleistungsprüfung: Alter, Kulanz, Versicherung, Kaufbeleg', () => {
    const base = records[0]!.file;
    const bought = (months: number) => ({
      ...base,
      case: { ...base.case, createdAt: new Date(NOW).toISOString() },
      device: {
        ...base.device,
        purchaseDate: new Date(NOW - months * 30.5 * 24 * H).toISOString(),
      },
      quote: undefined,
      protection: undefined,
    });
    expect(warrantyCheck(bought(10), s.rules)).toMatchObject({
      verdict: 'gewaehrleistung',
      months: 10,
    });
    expect(warrantyCheck(bought(27), s.rules).verdict).toBe('kulanz');
    expect(warrantyCheck(bought(40), s.rules).verdict).toBe('abgelehnt');
    expect(
      warrantyCheck(
        { ...bought(40), protection: { provider: 'X', product: 'Y', validUntil: base.sharedAt } },
        s.rules,
      ).verdict,
    ).toBe('an_versicherer');
    expect(
      warrantyCheck(
        {
          ...bought(10),
          photos: [{ id: 'p', takenAt: base.sharedAt, purpose: 'kaufbeleg', source: 'demo' }],
        },
        s.rules,
      ).proof,
    ).toBe(true);
  });

  test('Als Nächstes: annehmen, entscheiden, abschließen', () => {
    const neu = records.find((x) => x.workflow?.status === 'neu')!;
    expect(nextStep(neu, s)?.kind).toBe('annehmen');
    const termin = records.find((x) => x.workflow?.status === 'termin')!;
    expect(nextStep(termin, s)?.kind).toBe('abschliessen');
    const undecided = { ...neu, workflow: { ...neu.workflow!, status: 'wartet_uns' as const } };
    expect(nextStep(undecided, s)?.kind).toBe('entscheiden');
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
