// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

// Farben nur aus theme/ (CLAUDE.md: keine Hex-Werte außerhalb von theme/).
const colorLiterals = [
  {
    selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
    message: 'Keine Hex-Farben außerhalb von theme/. Nutze useTheme().colors.',
  },
  {
    selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]',
    message: 'Keine Hex-Farben außerhalb von theme/. Nutze useTheme().colors.',
  },
  {
    selector: 'Literal[value=/^\\s*(rgb|rgba|hsl|hsla)\\(/]',
    message: 'Keine Farbwerte außerhalb von theme/. Nutze useTheme().colors.',
  },
];

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: ['dist/*', '.expo/*', 'design-system/*', 'reference/*', 'expo-env.d.ts'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['theme/**'],
    rules: {
      'no-restricted-syntax': ['error', ...colorLiterals],
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
