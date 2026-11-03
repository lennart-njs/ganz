/**
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';

import { ESLint, type Linter } from 'eslint';

// Die eigenen Prüfungen aus eslint.config.js greifen gleichzeitig: Farbe, Text in JSX und
// Text in Ausdrücken. In der Flat-Config ersetzt ein späterer Block mit derselben Regel die
// Optionen. Darum ist jede Prüfung eine eigene Regel.

const root = path.join(__dirname, '..');

// Farbwerte zusammengesetzt, damit die Farbregel nicht diese Datei selbst meldet.
const hex = ['#', 'c0', 'ff', 'ee'].join('');
const rgba = ['rgba', '(0, 0, 0, 0.5)'].join('');

const fixture = `import { Text as RNText, View } from 'react-native';

import { Text } from '@/components/ds';
import { de } from '@/i18n/de';

export function Fixture({ ok, n, name }: { ok: boolean; n: number; name?: string }) {
  return (
    <View style={{ backgroundColor: '${hex}', borderColor: '${rgba}' }}>
      <RNText>{de.common.next}</RNText>
      <Text>Hallo</Text>
      <Text label="Fertig">{'Direkt'}</Text>
      <Text accessibilityLabel={\`Schritt \${n}\`}>{de.common.next}</Text>
      <Text>{ok ? 'Ja' : 'Nein'}</Text>
      <Text>{\`\${n} Geräte\`}</Text>
      <Text>{n + ' Stück'}</Text>
      <Text>{name ?? 'Unbekannt'}</Text>
      <Text title={ok ? 'Offen' : de.common.next}>{de.common.next}</Text>
      <Text options={['Hell', 'Dunkel']}>{de.common.next}</Text>
      <Text items={[{ value: 'system', label: 'Wie System' }]}>{de.common.next}</Text>
      <Text accessibilityHint={['Gerät', name].filter(Boolean).join(', ')}>{de.common.next}</Text>
      <Text accessibilityValue={{ text: \`\${n} von 5\` }}>{de.common.next}</Text>
      <Text variant={ok ? 'meta' : 'body'} tone={ok ? 'strong' : 'muted'}>{de.common.next}</Text>
      <Text testID={\`schritt-\${n}\`} style={{ textAlign: ok ? 'center' : 'left' }}>{n}</Text>
      <Text options={[{ value: 'hell', label: de.common.next }]}>{ok ? de.common.next : ''}</Text>
    </View>
  );
}
`;

const lines = fixture.split('\n');
const lineOf = (snippet: string) => {
  const i = lines.findIndex((l) => l.includes(snippet));
  if (i < 0) throw new Error(`Nicht in der Vorlage: ${snippet}`);
  return i + 1;
};

const OWN_RULES = [
  'ganz/farben-aus-theme',
  'ganz/text-aus-i18n',
  'ganz/text-in-ausdruecken',
  'ganz/kein-status-vergleich',
  'no-restricted-imports',
];

// Jest kann eslint.config.js nicht per import() laden. Darum kommt dieselbe Datei per require.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config: Linter.Config[] = require('../eslint.config.js');

const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config });

async function lint(file: string, source = fixture, linter = eslint): Promise<[string, number][]> {
  const [result] = await linter.lintText(source, { filePath: path.join(root, file) });
  return result!.messages
    .filter((m: Linter.LintMessage) => m.ruleId && OWN_RULES.includes(m.ruleId))
    .map((m: Linter.LintMessage): [string, number] => [m.ruleId!, m.line])
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
}

describe('eigene Lint-Regeln', () => {
  test('Farbe, alte Textregel und neue Textfälle greifen gleichzeitig in app/', async () => {
    const found = await lint('app/__lint-fixture__.tsx');
    const farbe = 'ganz/farben-aus-theme';
    const alt = 'ganz/text-aus-i18n';
    const neu = 'ganz/text-in-ausdruecken';
    expect(found).toEqual([
      ['no-restricted-imports', lineOf("import { Text as RNText, View } from 'react-native'")],
      // Farbe: Hex und rgba
      [farbe, lineOf('backgroundColor')],
      [farbe, lineOf('backgroundColor')],
      // alte Textregel: JSXText, Text-Prop, Literal in {}, Template-Literal in Text-Prop
      [alt, lineOf('<Text>Hallo</Text>')],
      [alt, lineOf('label="Fertig"')],
      [alt, lineOf('label="Fertig"')],
      [alt, lineOf('accessibilityLabel={`Schritt')],
      // neue Textfälle
      [neu, lineOf("{ok ? 'Ja' : 'Nein'}")],
      [neu, lineOf("{ok ? 'Ja' : 'Nein'}")],
      [neu, lineOf('Geräte`}')],
      [neu, lineOf("' Stück'")],
      [neu, lineOf("'Unbekannt'")],
      [neu, lineOf("title={ok ? 'Offen'")],
      [neu, lineOf("['Hell', 'Dunkel']")],
      [neu, lineOf("['Hell', 'Dunkel']")],
      [neu, lineOf("label: 'Wie System'")],
      [neu, lineOf("['Gerät', name]")],
      [neu, lineOf('von 5`')],
    ]);
  });

  test('Schlüssel, Pfade und Stile sind kein Text', async () => {
    const found = await lint('app/__lint-fixture__.tsx');
    for (const snippet of ["variant={ok ? 'meta'", 'testID={`schritt-', "value: 'hell'"]) {
      expect(found.filter(([, line]) => line === lineOf(snippet))).toEqual([]);
    }
  });

  test('außerhalb von app/ und components/ gilt nur die Farbregel, in theme/ keine', async () => {
    const lib = await lint('lib/__lint-fixture__.tsx');
    expect(lib.map(([rule]) => rule)).toEqual(['ganz/farben-aus-theme', 'ganz/farben-aus-theme']);
    expect(await lint('theme/__lint-fixture__.tsx')).toEqual([]);
  });
});

// Text außerhalb von JSX (Schritt 28): Konstanten, Objekte und Argumente von Aufrufen
const outsideFixture = `import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/ds';
import { de } from '@/i18n/de';

const TITLE = 'Neues Gerät anlegen';
const opts = { hint: 'Wähl bitte ein Zeitfenster.', label: 'kurz' };
const choices = [de.common.next, 'Später'];
const key = 'schaden_melden';
const route = \`/fall/\${key}\`;
const styles = StyleSheet.create({ title: { fontFamily: 'SchibstedGrotesk_600SemiBold' } });

export function Outside({ type }: { type: 'GO_BACK' | 'POP' }) {
  const [, setToast] = useState<string>();
  if (type === 'GO_BACK') console.warn('Zurück ohne Ziel');
  if (!route) throw new Error('Kein Weg zurück');
  return (
    <Button
      label={TITLE}
      sub={opts.hint}
      style={styles.title}
      onPress={() => setToast('Bitte erst ein Zeitfenster wählen.')}
      onLongPress={() => setToast(choices.join(', '))}
    />
  );
}
`;
const outsideLines = outsideFixture.split('\n');
const outsideLine = (snippet: string) => {
  const i = outsideLines.findIndex((l) => l.includes(snippet));
  if (i < 0) throw new Error(`Nicht in der Vorlage: ${snippet}`);
  return i + 1;
};

describe('Text außerhalb von JSX', () => {
  const TEXT = 'ganz/text-in-ausdruecken';
  const hits = async (file: string) =>
    (await lint(file, outsideFixture)).filter(([rule]) => rule === TEXT);

  test('meldet Konstanten, Objektwerte, Listen und Argumente in Handlern', async () => {
    expect(await hits('app/__outside-fixture__.tsx')).toEqual(
      ["TITLE = 'Neues", "hint: 'Wähl", "label: 'kurz'", "'Später'", "setToast('Bitte"].map(
        (snippet): [string, number] => [TEXT, outsideLine(snippet)],
      ),
    );
    expect(await hits('hooks/__outside-fixture__.tsx')).toHaveLength(5);
  });

  test('Schlüssel, Pfade, Vergleiche, Stile, Logs und Fehler der Domäne sind kein Text', async () => {
    const found = await hits('app/__outside-fixture__.tsx');
    for (const snippet of [
      "from 'react'",
      "key = 'schaden_melden'",
      'route = `/fall/',
      'fontFamily',
      "type === 'GO_BACK'",
      "console.warn('Zurück",
      "new Error('Kein",
    ]) {
      expect(found.filter(([, line]) => line === outsideLine(snippet))).toEqual([]);
    }
  });

  test('die Chat-Route auf dem Server zeigt nichts, lib/ prüft die Regel nicht', async () => {
    expect(await hits('app/api/__outside-fixture__+api.ts')).toEqual([]);
    expect(await hits('lib/__outside-fixture__.tsx')).toEqual([]);
  });
});

// Status-Vergleiche (Schritt 22): Screens fragen can() und die Fakten aus model/policies.
const statusFixture = `import { useAppStore } from '@/store/appStore';

export function useStatus(id: string, kind: string) {
  const c = useAppStore((s) => s.cases[id])!;
  const offen = c?.status === 'offen';
  const nichtZu = 'erledigt' !== c.status;
  const lose = c['status'] == 'abgelehnt';
  const anfang = ['offen', 'selbsthilfe'].includes(c!.status);
  switch (c.status) {
    default:
      break;
  }
  const geladen = c.loading.status === 'ok';
  const art = kind === 'reparatur';
  const { status } = c;
  const ohneMember = status === 'offen';
  const { status: umbenannt } = c;
  const auchUmbenannt = umbenannt !== 'erledigt';
  const kopie = c.status;
  const ausKopie = ['eskaliert'].includes(kopie);
  const fremd = kind;
  const keinStatus = fremd === 'pumpe';
  return { offen, nichtZu, lose, anfang, geladen, art, ohneMember, auchUmbenannt, ausKopie, keinStatus, status: c.status };
}
`;
const statusLines = statusFixture.split('\n');
const statusLine = (snippet: string) => {
  const i = statusLines.findIndex((l) => l.includes(snippet));
  if (i < 0) throw new Error(`Nicht in der Vorlage: ${snippet}`);
  return i + 1;
};
const STATUS = 'ganz/kein-status-vergleich';
const statusHits = async (file: string, linter = eslint) =>
  (await lint(file, statusFixture, linter)).filter(([rule]) => rule === STATUS);

/** Dieselbe Konfiguration, für app/ mit einer eigenen Allowlist */
const withAllowlist = (allow: unknown[]) =>
  new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: [
      ...config,
      { files: ['app/**/*.{ts,tsx}'], rules: { [STATUS]: ['error', { allow }] } },
    ],
  });

describe('kein Status-Vergleich in Screens', () => {
  test('meldet ===, !==, ==, includes und switch auf .status in app/ und components/', async () => {
    const expected = [
      "c?.status === 'offen'",
      "'erledigt' !== c.status",
      "c['status'] == 'abgelehnt'",
      '.includes(c!.status)',
      'switch (c.status)',
      "c.loading.status === 'ok'",
      // Über einen Namen: { status }, { status: x } und eine Kopie von c.status (Schritt 28)
      "ohneMember = status === 'offen'",
      "umbenannt !== 'erledigt'",
      '.includes(kopie)',
    ].map((snippet): [string, number] => [STATUS, statusLine(snippet)]);
    expect(await statusHits('app/__status-fixture__.tsx')).toEqual(expected);
    expect(await statusHits('components/__status-fixture__.tsx')).toEqual(expected);
  });

  test('ein Vergleich ohne .status und der Wert selbst sind erlaubt, lib/ und model/ sind frei', async () => {
    const hits = await statusHits('app/__status-fixture__.tsx');
    for (const snippet of ["kind === 'reparatur'", "fremd === 'pumpe'", 'status: c.status']) {
      expect(hits.filter(([, line]) => line === statusLine(snippet))).toEqual([]);
    }
    expect(await statusHits('lib/__status-fixture__.tsx')).toEqual([]);
    expect(await statusHits('model/__status-fixture__.ts')).toEqual([]);
  });

  test('die Allowlist nimmt einen Ausdruck mit Grund aus und meldet Einträge ohne Treffer', async () => {
    const file = 'app/__status-fixture__.tsx';
    const linter = withAllowlist([
      { file, code: "c.loading.status === 'ok'", reason: 'Ladezustand, kein Status eines Falls.' },
      { file, code: "c.status === 'gibt es nicht'", reason: 'Steht nicht im Code der Vorlage.' },
      {
        file: 'app/andere.tsx',
        code: "c?.status === 'offen'",
        reason: 'Gilt für eine andere Datei.',
      },
    ]);
    const [result] = await linter.lintText(statusFixture, { filePath: path.join(root, file) });
    const own = result!.messages.filter((m) => m.ruleId === STATUS);
    expect(own.map((m) => m.line)).not.toContain(statusLine("c.loading.status === 'ok'"));
    expect(own.map((m) => m.line)).toContain(statusLine("c?.status === 'offen'"));
    expect(own.filter((m) => m.messageId === 'unbenutzt').map((m) => m.message)).toEqual([
      expect.stringContaining("c.status === 'gibt es nicht'"),
    ]);
  });

  test('ein Eintrag ohne Grund ist ein Fehler in der Konfiguration', async () => {
    const file = 'app/__status-fixture__.tsx';
    const linter = withAllowlist([{ file, code: "c.loading.status === 'ok'" }]);
    await expect(
      linter.lintText(statusFixture, { filePath: path.join(root, file) }),
    ).rejects.toThrow(/kein-status-vergleich/);
  });

  test('die Allowlist im Repo: jeder Eintrag hat eine Datei, die es gibt, und einen Grund', () => {
    const entries = config.flatMap((block) => {
      const setting = block.rules?.[STATUS];
      return Array.isArray(setting) ? ((setting[1] as { allow?: unknown[] })?.allow ?? []) : [];
    }) as { file: string; code: string; reason: string }[];
    for (const e of entries) {
      expect(fs.existsSync(path.join(root, e.file))).toBe(true);
      expect(fs.readFileSync(path.join(root, e.file), 'utf8')).toContain(e.code);
      expect(e.reason.length).toBeGreaterThanOrEqual(10);
    }
  });
});
