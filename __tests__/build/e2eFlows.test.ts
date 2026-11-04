// Die Maestro-Flows in e2e/ laufen erst ab Schritt 30 auf einem Simulator. Bis dahin prüft dieser
// Test, dass sie nicht still veralten: Jeder Text steht so in i18n/de.ts oder data/guides.ts,
// jede ID kommt im Code vor, und die App-ID ist die des Pitch-Builds.
import fs from 'fs';
import path from 'path';

import { VARIANTS } from '@/app.config';
import { demoConfig } from '@/config/demo.config';
import { guides } from '@/data/guides';
import { de } from '@/i18n/de';

import { version } from '../../package.json';

const root = path.resolve(__dirname, '../..');
const e2e = path.join(root, 'e2e');
const FLOWS = ['golden-path.yaml', 'abbruch.yaml', 'dark-200.yaml', 'selbstbeteiligung.yaml'];

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
  segments: read(path.join(root, 'components/ds/SegmentedControl.tsx')),
};

/**
 * antwort-<Schlüssel>, details-<Ziel> und demo-<Gruppe>-<Wert> (Demo-Steuerung): Gibt es den
 * Schlüssel im Code?
 */
function idInCode(id: string): boolean {
  const demo = /^demo-(.+)-([^-]+)$/.exec(id);
  if (demo)
    return (
      sources.demo.includes(`testID="demo-${demo[1]}"`) && sources.demo.includes(`'${demo[2]}'`)
    );
  const [, prefix, key] = /^(antwort|details)-(.+)$/.exec(id) ?? [];
  if (!prefix || !key) return false;
  if (prefix === 'details') return sources.thread.includes(`details('${key}')`);
  const replyCode = sources.thread + sources.problem;
  if (key.endsWith('.*')) return replyCode.includes(`\`${key.slice(0, -2)}\${`);
  return replyCode.includes(`'${key}'`);
}

describe('Maestro-Flows in e2e/', () => {
  test('die Flows und ihr Teil-Flow sind da', () => {
    for (const flow of FLOWS) expect(fs.existsSync(path.join(e2e, flow))).toBe(true);
    expect(files.map(rel).sort()).toEqual(
      ['e2e/common/demo-startstand.yaml', ...FLOWS.map((f) => `e2e/${f}`)].sort(),
    );
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
});
