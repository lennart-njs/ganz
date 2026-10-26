// Liest guides() aus reference/demo-v1.0/Main.dc.html.
// Die Demo ist eine Spezifikation, kein Code der App. Wir werten nur das Objekt-Literal aus.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const IMG_KEYS = {
  '/_blob/ce0d408b6d9189b01cddecca3f9e1971': 'fehler',
  '/_blob/63279863ff9eb9c9958cef49ae4cbd7b': 'pumpe',
};

function readDemoGuides(
  file = path.join(__dirname, '..', 'reference', 'demo-v1.0', 'Main.dc.html'),
) {
  const html = fs.readFileSync(file, 'utf8');
  const start = html.indexOf('guides() {');
  const end = html.indexOf('componentWillUnmount()', start);
  if (start < 0 || end < 0) throw new Error('guides() nicht gefunden');
  const body = html.slice(start + 'guides() '.length, end).trim();
  const guides = vm.runInNewContext(`(function () ${body})()`, {}, { timeout: 1000 });
  for (const g of Object.values(guides)) {
    for (const s of g.steps) if (s.img) s.img = IMG_KEYS[s.img] ?? s.img;
  }
  return guides;
}

module.exports = { readDemoGuides };
