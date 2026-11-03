// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const path = require('path');

// Node-Globals für scripts/. Das Paket globals kommt mit eslint-config-expo.
const globals = require(
  require.resolve('globals', {
    paths: [path.dirname(require.resolve('eslint-config-expo/package.json'))],
  }),
);

// Eigene Prüfungen als lokales Plugin. Jede Prüfung ist eine eigene Regel mit eigener Stufe.
// In der Flat-Config ersetzt ein späterer Block mit derselben Regel die Optionen, statt sie zu
// ergänzen. Darum teilen sich Farbe und Text nicht mehr no-restricted-syntax.
// __tests__/lint.test.ts zeigt, dass alle Regeln gleichzeitig greifen.

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const COLOR_FUNCTION = /^\s*(rgb|rgba|hsl|hsla)\(/;
const LETTER = /\p{L}/u;
const LETTER_NEXT_TO_SPACE = /\p{L}\s|\s\p{L}/u;
const NON_ASCII_LETTER = /(?=\p{L})[^\x00-\x7F]/u;
const STARTS_UPPERCASE = /^\s*\p{Lu}/u;

// Props, deren Wert immer Text ist, den jemand liest oder hört.
const TEXT_PROPS = new Set([
  'label',
  'title',
  'sub',
  'meta',
  'message',
  'placeholder',
  'hint',
  'error',
  'accessibilityLabel',
  'accessibilityHint',
]);
const isTextProp = (name) => TEXT_PROPS.has(name);
// Methoden, deren Ergebnis die Texte der Liste enthält.
const TEXT_METHODS = new Set(['join', 'filter']);
const isStyleProp = (name) => name === 'style' || /Style$/.test(name);

// Konstanten wie 'GO_BACK' oder 'POP' sind Schlüssel, auch wenn sie groß anfangen.
const CONSTANT = /^[A-Z][A-Z0-9_]*$/;

/** Sieht ein Wert außerhalb der Text-Props nach Text aus und nicht nach einem Schlüssel wie 'primary'? */
const looksLikeText = (s) =>
  LETTER_NEXT_TO_SPACE.test(s) ||
  NON_ASCII_LETTER.test(s) ||
  (STARTS_UPPERCASE.test(s) && !CONSTANT.test(s));

const isString = (node) => node.type === 'Literal' && typeof node.value === 'string';

const attributeName = (attr) => (attr.name.type === 'JSXIdentifier' ? attr.name.name : null);

const propertyName = (prop) => {
  if (prop.computed) return null;
  if (prop.key.type === 'Identifier') return prop.key.name;
  if (isString(prop.key)) return prop.key.value;
  return null;
};

/**
 * Sammelt alle Texte, die aus einem Ausdruck sichtbar werden können: beide Zweige von
 * Bedingungen, Template-Literale, Verkettung mit +, Listen und Werte in Objekten.
 * Andere Aufrufe, Funktionen und Vergleiche bleiben außen vor. Dort stehen Schlüssel.
 */
function collectTexts(node, propName, out) {
  if (!node) return;
  switch (node.type) {
    case 'Literal':
      if (typeof node.value === 'string') out.push({ node, text: node.value, propName });
      return;
    case 'TemplateLiteral':
      out.push({ node, text: node.quasis.map((q) => q.value.cooked ?? '').join(''), propName });
      node.expressions.forEach((e) => collectTexts(e, propName, out));
      return;
    case 'ConditionalExpression':
      collectTexts(node.consequent, propName, out);
      collectTexts(node.alternate, propName, out);
      return;
    case 'LogicalExpression':
      collectTexts(node.left, propName, out);
      collectTexts(node.right, propName, out);
      return;
    case 'BinaryExpression':
      if (node.operator === '+') {
        collectTexts(node.left, propName, out);
        collectTexts(node.right, propName, out);
      }
      return;
    case 'ArrayExpression':
      node.elements.forEach((e) => collectTexts(e, propName, out));
      return;
    case 'SpreadElement':
      collectTexts(node.argument, propName, out);
      return;
    case 'ObjectExpression':
      for (const prop of node.properties) {
        if (prop.type === 'SpreadElement') {
          collectTexts(prop.argument, propName, out);
          continue;
        }
        const key = propertyName(prop);
        if (key && isStyleProp(key)) continue;
        collectTexts(prop.value, key ?? propName, out);
      }
      return;
    case 'CallExpression':
      // [name, 'Text'].filter(Boolean).join(', ') ergibt Text. Andere Aufrufe liefern Schlüssel.
      if (
        node.callee.type === 'MemberExpression' &&
        !node.callee.computed &&
        TEXT_METHODS.has(node.callee.property.name)
      ) {
        collectTexts(node.callee.object, propName, out);
      }
      return;
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
      collectTexts(node.expression, propName, out);
      return;
    default:
      return;
  }
}

const farbenAusTheme = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Farben nur aus theme/ (CLAUDE.md: keine Hex-Werte außerhalb von theme/).',
    },
    messages: {
      hex: 'Keine Hex-Farben außerhalb von theme/. Nutze useTheme().colors.',
      funktion: 'Keine Farbwerte außerhalb von theme/. Nutze useTheme().colors.',
    },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        if (!isString(node)) return;
        if (HEX.test(node.value)) context.report({ node, messageId: 'hex' });
        if (COLOR_FUNCTION.test(node.value)) context.report({ node, messageId: 'funktion' });
      },
      TemplateElement(node) {
        if (HEX.test(node.value.raw)) context.report({ node, messageId: 'hex' });
      },
    };
  },
};

const textAusI18n = {
  meta: {
    type: 'problem',
    docs: { description: 'Alle Texte in i18n/de.ts (CLAUDE.md): Text in JSX und in Text-Props.' },
    messages: {
      text: 'Text gehört in i18n/de.ts.',
      platzhalter: 'Text gehört in i18n/de.ts. Platzhalter als Funktion dort anlegen.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXText(node) {
        if (LETTER.test(node.value)) context.report({ node, messageId: 'text' });
      },
      'JSXExpressionContainer > Literal'(node) {
        if (isString(node) && LETTER.test(node.value)) context.report({ node, messageId: 'text' });
      },
      JSXAttribute(node) {
        const name = attributeName(node);
        if (!name || !isTextProp(name) || !node.value) return;
        if (node.value.type === 'Literal') {
          context.report({ node: node.value, messageId: 'text' });
        } else if (
          node.value.type === 'JSXExpressionContainer' &&
          node.value.expression.type === 'TemplateLiteral'
        ) {
          context.report({ node: node.value.expression, messageId: 'platzhalter' });
        }
      },
    };
  },
};

// Wo ein String nie Text für Menschen ist: Quelle eines Imports, Schlüssel, Typen, Logs und
// Fehler der Domäne (die App zeigt sie nie, hooks/useCommand.ts nimmt einen ruhigen Satz).
const isConsoleCall = (call) =>
  call.callee.type === 'MemberExpression' &&
  call.callee.object.type === 'Identifier' &&
  call.callee.object.name === 'console';
const isErrorConstruction = (call) =>
  call.callee.type === 'Identifier' && /Error$/.test(call.callee.name);
const isStyleSheetCreate = (call) =>
  call.callee.type === 'MemberExpression' &&
  call.callee.object.type === 'Identifier' &&
  call.callee.object.name === 'StyleSheet';

/** Ist dieser String ein Schlüssel, ein Pfad zum Import, ein Typ oder ein Stil? */
function isNeverText(node) {
  const parent = node.parent;
  if (!parent) return false;
  switch (parent.type) {
    case 'ImportDeclaration':
    case 'ExportAllDeclaration':
    case 'ExportNamedDeclaration':
    case 'ImportExpression':
      return parent.source === node;
    case 'Property':
    case 'MethodDefinition':
    case 'PropertyDefinition':
      if (parent.key === node && !parent.computed) return true;
      break;
    case 'MemberExpression':
      if (parent.property === node) return true;
      break;
    case 'TSLiteralType':
    case 'TSPropertySignature':
    case 'TSEnumMember':
      return true;
    case 'ExpressionStatement':
      return !!parent.directive;
    case 'BinaryExpression':
      // type === 'GO_BACK': ein Vergleich mit einem Schlüssel, kein Text auf dem Screen
      if (['===', '!==', '==', '!='].includes(parent.operator)) return true;
      break;
    case 'SwitchCase':
      return parent.test === node;
    default:
      break;
  }
  for (let n = parent; n; n = n.parent) {
    if (n.type === 'Property' && !n.computed && isStyleProp(propertyName(n) ?? '')) return true;
    if (n.type === 'JSXAttribute' && isStyleProp(attributeName(n) ?? '')) return true;
    if (n.type === 'CallExpression' && (isConsoleCall(n) || isStyleSheetCreate(n))) return true;
    if (n.type === 'NewExpression' && isErrorConstruction(n)) return true;
    if (n.type.startsWith('TS') && n.type.endsWith('Type')) return true;
  }
  return false;
}

/** Steht der String (auch in einer Bedingung oder Liste) als Wert einer Text-Prop, z. B. { hint: '…' }? */
function inTextProperty(node) {
  for (let n = node; n.parent; n = n.parent) {
    const p = n.parent;
    if (p.type === 'Property' && p.value === n) return isTextProp(propertyName(p) ?? '');
    if (
      ![
        'ConditionalExpression',
        'LogicalExpression',
        'BinaryExpression',
        'TemplateLiteral',
        'ArrayExpression',
        'TSAsExpression',
        'TSSatisfiesExpression',
      ].includes(p.type)
    ) {
      return false;
    }
  }
  return false;
}

const textInAusdruecken = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Alle Texte in i18n/de.ts, auch in Bedingungen, Template-Literalen, Verkettungen, Listen und Objekten in JSX, in Konstanten, Objekten und Argumenten von Aufrufen.',
    },
    messages: {
      text: 'Text gehört in i18n/de.ts, auch in Bedingungen, Listen und Objekten.',
      ausserhalb:
        'Text gehört in i18n/de.ts, auch in Konstanten, Objekten und Argumenten wie setToast(…).',
    },
    schema: [],
  },
  create(context) {
    // Was die Prüfung in JSX schon gemeldet hat, meldet die Prüfung außerhalb nicht noch einmal
    const reported = new Set();
    function check(root, { inChildren, attribute }) {
      // Ein einzelnes Literal und ein Template-Literal in einer Text-Prop meldet schon text-aus-i18n.
      if (root.type === 'Literal') return;
      if (root.type === 'TemplateLiteral' && attribute && isTextProp(attribute)) return;
      const found = [];
      collectTexts(root, attribute, found);
      for (const { node, text, propName } of found) {
        if (!LETTER.test(text)) continue;
        const isText = inChildren || (propName && isTextProp(propName)) || looksLikeText(text);
        if (isText) {
          reported.add(node);
          context.report({ node, messageId: 'text' });
        }
      }
    }
    /**
     * Jeder andere String im Code: Konstanten, Objekte, Rückgaben und Argumente, auch in
     * Funktionen in JSX wie onPress={() => setToast('…')}. Gemeldet wird, was nach Text aussieht.
     */
    function checkAnywhere(node, text) {
      if (reported.has(node) || !LETTER.test(text)) return;
      // Direkt in JSX prüfen das text-aus-i18n und check() oben
      const parent = node.parent;
      if (parent.type === 'JSXAttribute' || parent.type === 'JSXExpressionContainer') return;
      if (isNeverText(node)) return;
      if (looksLikeText(text) || inTextProperty(node)) {
        reported.add(node);
        context.report({ node, messageId: 'ausserhalb' });
      }
    }
    return {
      'Program:exit'() {
        reported.clear();
      },
      Literal(node) {
        if (isString(node)) checkAnywhere(node, node.value);
      },
      TemplateLiteral(node) {
        checkAnywhere(node, node.quasis.map((q) => q.value.cooked ?? '').join(''));
      },
      JSXExpressionContainer(node) {
        if (node.expression.type === 'JSXEmptyExpression') return;
        const parent = node.parent;
        if (parent.type === 'JSXElement' || parent.type === 'JSXFragment') {
          check(node.expression, { inChildren: true, attribute: null });
        } else if (parent.type === 'JSXAttribute') {
          const name = attributeName(parent);
          if (name && isStyleProp(name)) return;
          check(node.expression, { inChildren: false, attribute: name });
        }
      },
    };
  },
};

// Status-Vergleiche gehören in die Regeln (model/policies, Schritt 22). Screens fragen can().
const COMPARISON = new Set(['===', '!==', '==', '!=']);

/** x.status, x?.status oder x['status'] */
function isStatusMember(node) {
  let n = node;
  while (n && ['ChainExpression', 'TSNonNullExpression', 'TSAsExpression'].includes(n.type)) {
    n = n.expression;
  }
  if (!n || n.type !== 'MemberExpression') return false;
  if (!n.computed) return n.property.type === 'Identifier' && n.property.name === 'status';
  return isString(n.property) && n.property.value === 'status';
}

/** Die Variable, auf die ein Name an dieser Stelle zeigt */
function resolve(context, id) {
  for (let scope = context.sourceCode.getScope(id); scope; scope = scope.upper) {
    const variable = scope.set.get(id.name);
    if (variable) return variable;
  }
  return undefined;
}

/**
 * Ein Name, der einen Status trägt: heißt status, kommt aus { status } oder { status: x } oder
 * wurde mit x.status belegt. So fällt auch const { status } = c; status === 'offen' auf.
 */
function isStatusName(context, node) {
  if (node.type !== 'Identifier') return false;
  if (node.name === 'status') return true;
  const variable = resolve(context, node);
  return !!variable?.defs.some((def) => {
    const prop = def.name.parent;
    if (prop?.type === 'Property' && prop.parent?.type === 'ObjectPattern') {
      return propertyName(prop) === 'status';
    }
    return def.node.type === 'VariableDeclarator' && def.node.init && isStatusMember(def.node.init);
  });
}

const squash = (s) => s.replace(/\s+/g, ' ').trim();

const keinStatusVergleich = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Kein Vergleich mit einem Status in Screens und Komponenten, auch nicht über { status } oder eine Variable. Was erlaubt ist, sagen can() und die Fakten aus model/policies.',
    },
    messages: {
      vergleich:
        'Kein Status-Vergleich in Screens. Frag can() oder availableActions() aus model/policies/actions.ts oder die Fakten aus caseFacts.ts.',
      unbenutzt:
        'Eintrag in der Allowlist ohne Treffer: {{code}}. Entferne ihn aus eslint.config.js.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                file: { type: 'string', minLength: 1 },
                code: { type: 'string', minLength: 1 },
                reason: { type: 'string', minLength: 10 },
              },
              required: ['file', 'code', 'reason'],
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    // Pfad relativ zu dieser Datei, also zum Repo, egal von wo ESLint läuft
    const file = path.relative(__dirname, context.filename).split(path.sep).join('/');
    const allow = (context.options[0]?.allow ?? []).filter((entry) => entry.file === file);
    const used = new Set();
    const check = (node) => {
      const code = squash(context.sourceCode.getText(node));
      const entry = allow.find((e) => squash(e.code) === code);
      if (entry) used.add(entry);
      else context.report({ node, messageId: 'vergleich' });
    };
    const isStatus = (node) => isStatusMember(node) || isStatusName(context, node);
    return {
      BinaryExpression(node) {
        if (!COMPARISON.has(node.operator)) return;
        if (isStatus(node.left) || isStatus(node.right)) check(node);
      },
      SwitchStatement(node) {
        if (isStatus(node.discriminant)) check(node.discriminant);
      },
      // ['offen', 'selbsthilfe'].includes(c.status) ist auch ein Vergleich
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.property.name === 'includes' &&
          node.arguments.some(isStatus)
        ) {
          check(node);
        }
      },
      'Program:exit'(node) {
        for (const entry of allow) {
          if (!used.has(entry)) {
            context.report({ node, messageId: 'unbenutzt', data: { code: entry.code } });
          }
        }
      },
    };
  },
};

/**
 * Status-Vergleiche, die keine Regel eines Falls oder Termins sind. Je Eintrag: Datei, der
 * Ausdruck genau wie im Code und ein Grund. Die Liste soll leer bleiben. Ein Eintrag ohne Treffer
 * meldet die Regel selbst.
 */
const LOAD_STATUS = 'Ladezustand des gespeicherten Stands (Schritt 19), kein Status eines Falls.';
const STATUS_ALLOWLIST = [
  {
    file: 'components/app/RecoveryScreen.tsx',
    code: "store.loading.getState().status === 'ok'",
    reason: LOAD_STATUS,
  },
  // useHydrated() liefert 'laedt', 'ok' oder 'fehler'. Danach wählt das Layout RecoveryScreen.
  { file: 'app/_layout.tsx', code: "status === 'fehler'", reason: LOAD_STATUS },
  { file: 'app/_layout.tsx', code: "status === 'laedt'", reason: LOAD_STATUS },
  { file: 'app/_layout.tsx', code: "status !== 'laedt'", reason: LOAD_STATUS },
];

const ganz = {
  meta: { name: 'ganz' },
  rules: {
    'farben-aus-theme': farbenAusTheme,
    'text-aus-i18n': textAusI18n,
    'text-in-ausdruecken': textInAusdruecken,
    'kein-status-vergleich': keinStatusVergleich,
  },
};

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: ['dist/*', '.expo/*', 'design-system/*', 'reference/*', 'expo-env.d.ts'],
  },
  {
    // Werkzeuge und diese Konfiguration laufen in Node, nicht in der App.
    files: ['scripts/**/*.js', 'eslint.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    plugins: { ganz },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['theme/**'],
    rules: {
      'ganz/farben-aus-theme': 'error',
    },
  },
  {
    // Alle Texte in i18n/de.ts (CLAUDE.md). Gilt für Screens, Komponenten und Hooks. Die Chat-Route
    // (app/api/*+api.ts) läuft auf dem Server und zeigt nichts: Sie antwortet mit Schlüsseln wie
    // { error: 'voll' } und nennt Header wie 'Retry-After'.
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}'],
    ignores: ['app/**/*+api.ts'],
    rules: {
      'ganz/text-aus-i18n': 'error',
      'ganz/text-in-ausdruecken': 'error',
    },
  },
  {
    // Keine Status-Vergleiche in Screens (Schritt 22). Ausnahmen nur mit Grund.
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}'],
    rules: {
      'ganz/kein-status-vergleich': ['error', { allow: STATUS_ALLOWLIST }],
    },
  },
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    ignores: ['components/ds/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Text'],
              message: 'Nutze Text aus @/components/ds (Typo-Rollen, Dynamic Type bis 200 %).',
            },
          ],
        },
      ],
    },
  },
]);
