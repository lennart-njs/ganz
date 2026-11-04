import { APP_VARIANTS, VARIANTS, resolveAppVariant, type AppVariant } from '@/app.config';

import eas from '../../eas.json';

interface BuildProfile {
  developmentClient?: boolean;
  distribution?: string;
  channel?: string;
  environment?: string;
  autoIncrement?: boolean;
  env?: Record<string, string>;
}

const profiles: Record<string, BuildProfile> = eas.build;
const profile = (variant: AppVariant): BuildProfile => {
  const p = profiles[variant];
  if (!p) throw new Error(`Profil ${variant} fehlt in eas.json`);
  return p;
};

describe('eas.json', () => {
  test('hat genau die Profile der App-Varianten', () => {
    expect(Object.keys(profiles).sort()).toEqual([...APP_VARIANTS].sort());
  });

  test.each(APP_VARIANTS)('%s setzt APP_VARIANT und EXPO_PUBLIC_APP_VARIANT gleich', (variant) => {
    const env = profile(variant).env ?? {};
    expect(env.APP_VARIANT).toBe(variant);
    expect(env.EXPO_PUBLIC_APP_VARIANT).toBe(variant);
    expect(resolveAppVariant(env)).toBe(variant);
  });

  test.each(APP_VARIANTS)('%s baut mit dem Kanal aus app.config.ts', (variant) => {
    expect(profile(variant).channel).toBe(VARIANTS[variant].channel);
  });

  test.each(APP_VARIANTS)('%s nennt eine EAS-Umgebung für Builds und Updates', (variant) => {
    expect(['development', 'preview', 'production']).toContain(profile(variant).environment);
  });

  test('development ist ein Dev-Client zur internen Verteilung', () => {
    expect(profile('development')).toMatchObject({
      developmentClient: true,
      distribution: 'internal',
    });
  });

  test('pitch geht nur intern raus, production in den Store', () => {
    expect(profile('pitch').distribution).toBe('internal');
    expect(profile('pitch').developmentClient).toBeUndefined();
    expect(profile('production').distribution).toBeUndefined();
    expect(profile('production').developmentClient).toBeUndefined();
  });

  test('Builds nur aus einem Commit, Build-Nummern zählt EAS', () => {
    expect(eas.cli).toMatchObject({ appVersionSource: 'remote', requireCommit: true });
  });
});
