// Die Maestro-Flows in e2e/ laufen erst ab Schritt 30 auf einem Simulator. Bis dahin prüft dieser
// Test, dass sie nicht still veralten: Jeder Text steht so in i18n/de.ts oder data/guides.ts,
// jede ID kommt im Code vor, und die App-ID ist die des Pitch-Builds.
import fs from 'fs';
import path from 'path';

import { VARIANTS } from '@/app.config';
import { demoConfig } from '@/config/demo.config';
import { catalog } from '@/data/catalog';
import { guides } from '@/data/guides';
import { modelGuides } from '@/data/modelGuides';
import { de } from '@/i18n/de';

import { version } from '../../package.json';

const root = path.resolve(__dirname, '../..');
const e2e = path.join(root, 'e2e');
const FLOWS = [
  'golden-path.yaml',
  'abbruch.yaml',
  'dark-200.yaml',
  'selbstbeteiligung.yaml',
  'gewaehrleistung.yaml',
  'haendler.yaml',
];
const COMMON = ['common/demo-startstand-versicherung.yaml'];

function yamlFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return yamlFiles(full);
    return entry.name.endsWith('.yaml') ? [full] : [];
  });
}

const files = yamlFiles(e2e);
const read = (file: string) => fs.readFileSync(file, 'utf8');
const rel = (file: string) => path.relative(root, file);

/** Ein skalarer YAML-Wert in einfachen oder doppelten Anführungszeichen, wie Prettier ihn schreibt. */
function scalar(raw: string): string | undefined {
  const value = raw.trim();
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  if (value.startsWith('"') && value.endsWith('"'))
    return value.slice(1, -1).replace(/\\\\/g, '\\');
  return undefined;
}

interface Selector {
  file: string;
  line: number;
  kind: 'text' | 'id';
  value: string;
}

const TEXT_SHORTHAND = /^\s*-\s*(?:tapOn|assertVisible|assertNotVisible):\s*(.+)$/;
const TEXT_KEY = /^\s*(?:text|visible|notVisible):\s*(.+)$/;
const ID_KEY = /^\s*id:\s*(.+)$/;

function selectors(file: string): Selector[] {
  const out: Selector[] = [];
  read(file)
    .split('\n')
    .forEach((text, i) => {
      if (text.trimStart().startsWith('#')) return;
      const line = i + 1;
      const id = ID_KEY.exec(text);
      const plain = TEXT_SHORTHAND.exec(text) ?? TEXT_KEY.exec(text);
      const match = id ?? plain;
      // Ohne Wert in derselben Zeile folgt eine Map (text:, id:, …) in den nächsten Zeilen
      if (!match || !match[1]!.trim()) return;
      const value = scalar(match[1]!);
      if (value === undefined) {
        throw new Error(`${rel(file)}:${line}: Selektor ohne Anführungszeichen: ${text.trim()}`);
      }
      out.push({ file, line, kind: id ? 'id' : 'text', value });
    });
  return out;
}

/** Alle Texte aus de, Funktionen mit Platzhaltern aufgerufen, dazu die Anleitungen. */
function knownTexts(): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === 'string') out.push(value);
    else if (typeof value === 'function') {
      try {
        const result: unknown = value(...Array<string>(value.length).fill('X'));
        if (typeof result === 'string') out.push(result);
      } catch {
        // Funktionen, die mehr als Text brauchen, zählen hier nicht
      }
    } else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(de);
  for (const g of Object.values(guides)) {
    out.push(g.title, ...g.steps.map((s) => s.t));
  }
  // Was die Flows mit echten Werten erwarten
  out.push(
    de.profile.version(version),
    de.a11y.starsOf(5),
    de.costs.preview(demoConfig.insurer.shortName),
  );
  return out;
}

const texts = knownTexts();
const fullMatch = (pattern: string) => new RegExp(`^(?:${pattern})$`, 'u');

const sources = {
  thread: read(path.join(root, 'app/fall/[id]/index.tsx')),
  problem: read(path.join(root, 'app/fall/neu.tsx')),
  replies: read(path.join(root, 'components/app/Conversation.tsx')),
  demo: read(path.join(root, 'components/app/DemoControlSheet.tsx')),
  setup: read(path.join(root, 'components/app/DeviceSetup.tsx')),
  segments: read(path.join(root, 'components/ds/SegmentedControl.tsx')),
};

/** Einstiege aus der Gebrauchsanweisung: „Problem melden“ nimmt ihren Schlüssel als Antwort */
const catalogProblems = new Set(catalog.flatMap((m) => (m.problems ?? []).map((p) => p.id)));

/**
 * antwort-<Schlüssel>, details-<Ziel>, demo-<Gruppe>-<Wert> (Demo-Steuerung) und beim Anlegen
 * des Geräts geraet-katalog-<Katalog-Schlüssel> und geraet-haendler-<Händler>: Gibt es den
 * Schlüssel im Code oder in Katalog und Konfiguration?
 */
function idInCode(id: string): boolean {
  const demo = /^demo-(.+)-([^-]+)$/.exec(id);
  if (demo)
    return (
      sources.demo.includes(`testID="demo-${demo[1]}"`) && sources.demo.includes(`'${demo[2]}'`)
    );
  const setup = /^geraet-(katalog|haendler)-(.+)$/.exec(id);
  if (setup) {
    const [, list, key] = setup;
    const known =
      list === 'katalog'
        ? catalog.some((m) => m.id === key)
        : demoConfig.dealers.some((d) => d.id === key);
    const template = list === 'katalog' ? '`geraet-katalog-${m.id}`' : '`geraet-haendler-${d.id}`';
    return known && sources.setup.includes(`testID={${template}}`);
  }
  const [, prefix, key] = /^(antwort|details)-(.+)$/.exec(id) ?? [];
  if (!prefix || !key) return false;
  if (prefix === 'details') return sources.thread.includes(`details('${key}')`);
  if (sources.problem.includes('key: p.id') && catalogProblems.has(key)) return true;
  const replyCode = sources.thread + sources.problem;
  if (key.endsWith('.*')) return replyCode.includes(`\`${key.slice(0, -2)}\${`);
  return replyCode.includes(`'${key}'`);
}

describe('Maestro-Flows in e2e/', () => {
  test('die Flows und ihr Teil-Flow sind da', () => {
    for (const flow of FLOWS) expect(fs.existsSync(path.join(e2e, flow))).toBe(true);
    expect(files.map(rel).sort()).toEqual([...COMMON, ...FLOWS].map((f) => `e2e/${f}`).sort());
  });

  test.each(files.map(rel))('%s: App-ID des Pitch-Builds, Hinweis „Nicht gelaufen“', (file) => {
    const text = read(path.join(root, file));
    expect(text).toMatch(new RegExp(`^appId: ${VARIANTS.pitch.appId.replace(/\./g, '\\.')}$`, 'm'));
    expect(text).toContain('Nicht gelaufen');
  });

  test.each(files.map(rel))('%s: jeder Teil-Flow existiert', (file) => {
    const refs = [...read(path.join(root, file)).matchAll(/runFlow:\s*(\S+\.yaml)/g)];
    for (const [, ref] of refs) {
      expect(fs.existsSync(path.join(path.dirname(path.join(root, file)), ref!))).toBe(true);
    }
  });

  test.each(files.map(rel))('%s: jeder Text steht in i18n/de.ts oder data/guides.ts', (file) => {
    const missing = selectors(path.join(root, file))
      .filter((s) => s.kind === 'text')
      .filter((s) => !texts.some((t) => fullMatch(s.value).test(t)))
      .map((s) => `${s.line}: ${s.value}`);
    expect(missing).toEqual([]);
  });

  test.each(files.map(rel))('%s: jede ID kommt im Code vor', (file) => {
    const missing = selectors(path.join(root, file))
      .filter((s) => s.kind === 'id')
      .filter((s) => !idInCode(s.value))
      .map((s) => `${s.line}: ${s.value}`);
    expect(missing).toEqual([]);
  });

  test('kein Name und kein Preis aus config/demo.config.ts in den Flows', () => {
    const names = [
      demoConfig.insurer.name,
      demoConfig.insurer.shortName,
      demoConfig.expert.name,
      demoConfig.contract.number,
      ...demoConfig.partners.map((p) => p.name),
      ...demoConfig.dealers.flatMap((d) => [
        d.name,
        d.shortName,
        ...('service' in d && d.service ? [d.service.name, d.service.expert] : []),
      ]),
      ...demoConfig.slots,
    ];
    const hits = files.flatMap((file) =>
      names.filter((name) => read(file).includes(name)).map((name) => `${rel(file)}: ${name}`),
    );
    expect(hits).toEqual([]);
  });

  test('die Antworten und Details-Links tragen die IDs, die die Flows nutzen', () => {
    expect(sources.replies).toContain('testID={`antwort-${r.key}`}');
    expect(sources.thread).toContain('testID={`details-${path}`}');
    expect(sources.segments).toContain('testID={testID ? `${testID}-${o.value}` : undefined}');
  });

  test('Katalog-Zeilen und Händler-Karten geben ihre ID weiter', () => {
    for (const file of ['components/ds/NavRow.tsx', 'components/ds/SelectCard.tsx']) {
      expect(read(path.join(root, file))).toContain('testID={testID}');
    }
  });

  test('der Händler-Weg nimmt das Gerät und den Händler des Demo-Startstands', () => {
    const flow = read(path.join(e2e, 'haendler.yaml'));
    expect(flow).toContain(`id: 'geraet-katalog-${demoConfig.dealerDemo.catalogId}'`);
    expect(flow).toContain(`id: 'geraet-haendler-${demoConfig.dealers[0]!.id}'`);
    // Der Einstieg „antwort-<Schlüssel>“ gehört zu genau diesem Gerät
    const model = catalog.find((m) => m.id === demoConfig.dealerDemo.catalogId)!;
    const [, problem] = /id: 'antwort-(gs_[a-z]+)'/.exec(flow) ?? [];
    expect(model.problems?.map((p) => p.id)).toContain(problem);
  });
});

// Pitch-Check und Demo-Ablauf sind Anleitungen für Menschen. Was dort „in Anführungszeichen“ steht,
// ist ein Knopf oder ein Text auf dem Bildschirm. Heißt er anders, sucht man am Tag der Demo.
describe('Pitch-Check und Demo-Ablauf nennen nur Texte, die es gibt', () => {
  /** Ein Abschnitt ab seiner Überschrift bis zur nächsten Überschrift derselben Ebene */
  const part = (file: string, heading: string) => {
    const text = read(path.join(root, file));
    const start = text.indexOf(`\n${heading}\n`);
    if (start < 0) throw new Error(`${file}: Überschrift fehlt: ${heading}`);
    const level = heading.split(' ')[0]!;
    const end = text.indexOf(`\n${level} `, start + heading.length + 2);
    return text.slice(start, end < 0 ? undefined : end);
  };
  /** Nur die nummerierten Schritte, ohne „Bestanden, wenn“ und die monatlichen Zusätze */
  const steps = (text: string) => text.split('\n').filter((l) => /^\d+\. /.test(l));
  /** Ohne Verweise auf Abschnitte anderer Dateien wie `docs/ABLAEUFE.md` → „Starten“ */
  const quoted = (lines: string[]) =>
    lines
      .map((l) => l.replace(/`[^`]+\.md` → „[^“]+“/g, ''))
      .flatMap((l) => [...l.matchAll(/„([^“]+)“/g)].map((m) => m[1]!));

  // Texte mit echten Namen (die Flows nennen keine, der Pitch-Check schon), dazu Katalog und
  // Anleitungen der Modelle
  const names = demoConfig.dealers.flatMap((d) => [d.name, d.shortName]);
  const shown = new Set(texts);
  const walk = (value: unknown) => {
    if (typeof value === 'function' && value.length > 0) {
      for (const name of names) {
        try {
          const result: unknown = value(...Array<string>(value.length).fill(name));
          if (typeof result === 'string') shown.add(result);
        } catch {
          // Funktionen, die mehr als Text brauchen, zählen hier nicht
        }
      }
    } else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(de);
  for (const m of catalog) for (const p of m.problems ?? []) shown.add(p.label);
  for (const g of Object.values(modelGuides)) for (const s of g.steps) shown.add(s.t);

  test.each([
    ['docs/PITCH_CHECK.md', '## Ablauf'],
    ['docs/PITCH_CHECK.md', '### 1. Händler-Weg (Demo)'],
    ['docs/ABLAEUFE.md', '## Demo'],
  ])('%s, „%s“', (file, heading) => {
    const quotes = quoted(steps(part(file, heading)));
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes.filter((q) => !shown.has(q))).toEqual([]);
  });
});
