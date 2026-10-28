import { renderRouter, screen } from 'expo-router/testing-library';
import * as RN from 'react-native';
import { StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import { useAppStore } from '@/store/appStore';

const APP = './app';

/** Fall auf dem Golden Path bis zum Abschluss, dazu ein zweiter offener Fall */
function world() {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
  s.linkContract('vertragsnummer');
  const device = s.addDevice({
    manufacturerId: 'miele',
    category: 'waschmaschine',
    model: 'WKB 130',
    identifiedBy: 'vertrag',
    contractId: useAppStore.getState().contracts[0]!.id,
  });
  const c = s.createCase({
    deviceId: device.id,
    entry: 'foto',
    problemLabel: 'Wasserablauf gestört',
  });
  s.addPhoto({
    caseId: c.id,
    deviceId: device.id,
    purpose: 'display',
    source: 'in_app_camera',
    uri: '',
  });
  s.addDiagnosis({
    caseId: c.id,
    photoIds: [],
    mode: 'display',
    errorPattern: 'wasserablauf',
    displayMessage: 'Wasserablauf',
    component: 'Laugenfilter',
    confidence: 'hoch',
    confidenceScore: 0.9,
    source: 'fehlererkennung',
    guideId: 'ablauf',
  });
  const run = s.startGuide(c.id, 'ablauf');
  s.moveGuideStep(run.id, 'next');
  s.grantConsent({
    caseId: c.id,
    purpose: 'weitergabe_fachkraft',
    legalBasis: 'vertrag',
    recipient: { id: 'brandt', kind: 'betrieb', name: 'Hausgeräte Brandt' },
    dataCategories: [],
    textVersion: '1',
  });
  const open = s.createCase({
    deviceId: device.id,
    entry: 'meldung',
    problemLabel: 'Wasserzulauf gestört',
  });
  const g2 = s.startGuide(open.id, 'zulauf');
  s.moveGuideStep(g2.id, 'next');
  s.finishGuide(run.id, 'geht_nicht');
  const v = s.requestVideoCall(c.id);
  s.updateVideoCall(v.id, 'verbunden');
  s.setFinding(c.id, 'reparatur', 'fachkraft');
  s.reportClaim(c.id, '1');
  s.requestBooking({
    caseId: c.id,
    kind: 'reparatur',
    partnerId: 'brandt',
    slotLabel: 'Mo vormittags',
    selfPay: false,
  });
  for (let i = 0; i < 4; i++) s.simulateNext(c.id);
  s.grantConsent({
    purpose: 'chat_assistent',
    legalBasis: 'einwilligung',
    recipient: { id: 'anthropic', kind: 'dienstleister', name: 'Anthropic' },
    dataCategories: [],
    textVersion: 'test',
  });
  s.addChatMessage({ caseId: open.id, role: 'haushalt', text: 'Es kommt kein Wasser.' });
  s.addChatMessage({
    caseId: open.id,
    role: 'assistent',
    text: 'Ist der Wasserhahn ganz offen?',
    suggestion: 'anleitung',
    guideId: 'zulauf',
  });
  const claim = s.createCase({ deviceId: device.id, entry: 'foto', problemLabel: 'Wasserablauf' });
  s.escalate(claim.id);
  s.setFinding(claim.id, 'reparatur', 'fachkraft');
  return { device: device.id, done: c.id, open: open.id, video: v.id, claim: claim.id };
}

function textOf(node: TestInstance): string {
  return node.children
    .map((ch) => (typeof ch === 'string' ? ch : textOf(ch)))
    .join(' ')
    .trim();
}

/** Bedienteile: Host-Elemente, die auf Berührung reagieren */
function controls(): TestInstance[] {
  return screen.container.queryAll((n) => typeof n.props.onResponderRelease === 'function');
}

/** Tab-Leiste von React Navigation: 70 pt hoch, Beschriftung skaliert wie im System nicht mit */
function inTabBar(n: TestInstance): boolean {
  for (let x: TestInstance | null = n; x; x = x.parent) {
    const label = x.props.accessibilityLabel ?? x.props['aria-label'];
    if (typeof label === 'string' && /, tab, \d of \d$/.test(label)) return true;
  }
  return false;
}

function check(route: string) {
  const problems: string[] = [];
  for (const n of controls()) {
    if (inTabBar(n)) continue;
    const p = n.props;
    const role = p.accessibilityRole ?? p.role;
    const label = p.accessibilityLabel ?? p['aria-label'] ?? textOf(n);
    const style = StyleSheet.flatten(p.style) ?? {};
    const name = `${route} → ${label || n.type}`;
    if (p.accessible === false) continue;
    if (!role) problems.push(`${name}: keine Rolle`);
    if (!label) problems.push(`${name}: kein Label`);
    // Vollflächige Elemente (Hintergrund hinter Sheets) brauchen keine Mindestgröße
    if (style.position === 'absolute') continue;
    const size = Math.max(Number(style.minHeight ?? 0), Number(style.height ?? 0));
    const hit = p.hitSlop ? 16 : 0;
    if (size + hit < 44 && !style.aspectRatio && !style.flexGrow) {
      problems.push(`${name}: Trefferfläche ${size} pt`);
    }
  }
  for (const n of screen.container.queryAll((x) => x.type === 'TextInput')) {
    if (!n.props.accessibilityLabel) problems.push(`${route} → Eingabefeld ohne Label`);
  }
  for (const n of screen.container.queryAll((x) => x.type === 'Text')) {
    if (n.props.numberOfLines && !inTabBar(n))
      problems.push(`${route} → Text gekürzt: ${textOf(n)}`);
  }
  return problems;
}

const routes = (w: ReturnType<typeof world>) => [
  '/',
  '/faelle',
  '/profil',
  `/geraet/${w.device}`,
  '/geraet/neu',
  '/schutz-verknuepfen',
  '/galerie',
  `/fall/neu?geraet=${w.device}`,
  `/fall/${w.open}/kamera`,
  `/fall/${w.open}/anleitung`,
  `/fall/${w.done}/videocall?video=${w.video}`,
  `/fall/${w.done}/fallakte`,
  // Das Gespräch des Falls in drei Lagen: Anleitung mit Assistent, Kosten, abgeschlossen
  `/fall/${w.open}`,
  `/fall/${w.claim}`,
  `/fall/${w.done}`,
];

describe('Barrierefreiheit: jedes Bedienteil hat Rolle, Label und 44 pt', () => {
  const w = world();
  test.each(routes(w))('%s', async (route) => {
    world();
    await renderRouter(APP, { initialUrl: route });
    expect(check(route)).toEqual([]);
  });

  test.each(['/willkommen', '/schutz', '/geraet-bestaetigen', '/typenschild'])(
    'Onboarding %s',
    async (route) => {
      useAppStore.getState().reset();
      await renderRouter(APP, { initialUrl: route });
      expect(check(route)).toEqual([]);
    },
  );
});

describe('Dynamic Type bis 200 %', () => {
  const w = world();
  test.each(routes(w))('%s: jeder Text wächst mit, Spalten stapeln sich', async (route) => {
    world();
    const spy = jest
      .spyOn(RN, 'useWindowDimensions')
      .mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 2 });
    await renderRouter(APP, { initialUrl: route });
    const problems: string[] = [];
    for (const n of screen.container.queryAll((x) => x.type === 'Text')) {
      if (inTabBar(n)) continue;
      const text = textOf(n);
      // Sterne sind ein Zeichen in einem 48-pt-Feld mit eigenem Label
      if (text === '★') continue;
      if (n.props.allowFontScaling === false) problems.push(`${route} → skaliert nicht: ${text}`);
      if (n.props.maxFontSizeMultiplier !== undefined && n.props.maxFontSizeMultiplier < 2) {
        problems.push(`${route} → Obergrenze unter 200 %: ${text}`);
      }
    }
    // Bei großer Schrift steht keine Label-Spalte mit fester Breite neben dem Wert
    for (const n of screen.container.queryAll((x) => x.type === 'Text')) {
      const style = StyleSheet.flatten(n.props.style) ?? {};
      if (style.flexBasis !== undefined) problems.push(`${route} → Spalte bei 200 %: ${textOf(n)}`);
    }
    spy.mockRestore();
    expect(problems).toEqual([]);
  });
});
