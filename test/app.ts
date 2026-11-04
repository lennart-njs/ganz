// Die App für renderRouter. Router-Tests importieren APP von hier statt './app' selbst zu nennen.
import { getMockContext } from 'expo-router/testing-library';

export const APP = './app';

// Alle Routen schon laden, während Jest die Testdatei einliest. Sonst lädt der erste
// renderRouter jeder Datei die ganze App, auf einem kalten Cache samt Übersetzen. Das
// dauert unter Last länger als die 5 s, die ein Test hat. API-Routen lädt der Router nicht.
const routes = getMockContext(APP);
for (const key of routes.keys()) {
  if (!/\+api\.[jt]sx?$/.test(key)) routes(key);
}
