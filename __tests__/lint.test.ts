/**
 * @jest-environment node
 */
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
  'no-restricted-imports',
];

// Jest kann eslint.config.js nicht per import() laden. Darum kommt dieselbe Datei per require.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config: Linter.Config[] = require('../eslint.config.js');

const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config });

async function lint(file: string): Promise<[string, number][]> {
  const [result] = await eslint.lintText(fixture, { filePath: path.join(root, file) });
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
