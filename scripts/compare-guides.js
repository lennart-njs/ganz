// Vergleicht data/guides.ts mit guides() aus der Demo. Alle Texte müssen gleich sein.
// Aufruf: npm run guides:check (läuft als Jest-Test, weil data/guides.ts TypeScript ist)
const { readDemoGuides } = require('./demoGuides');

function compare(appGuides, demoGuides) {
  const errors = [];
  const ids = new Set([...Object.keys(appGuides), ...Object.keys(demoGuides)]);
  for (const id of ids) {
    const a = appGuides[id];
    const d = demoGuides[id];
    if (!a || !d) {
      errors.push(`${id}: fehlt in ${a ? 'der Demo' : 'data/guides.ts'}`);
      continue;
    }
    for (const key of ['title', 'code']) {
      if (a[key] !== d[key]) errors.push(`${id}.${key}: „${a[key]}“ statt „${d[key]}“`);
    }
    if (!!a.noSelf !== !!d.noSelf) errors.push(`${id}.noSelf weicht ab`);
    if (a.steps.length !== d.steps.length) {
      errors.push(`${id}: ${a.steps.length} statt ${d.steps.length} Schritte`);
      continue;
    }
    d.steps.forEach((ds, i) => {
      const as = a.steps[i];
      for (const key of ['t', 'd', 'tool', 'w', 'img']) {
        if (as[key] !== ds[key])
          errors.push(`${id}.steps[${i}].${key}: „${as[key]}“ statt „${ds[key]}“`);
      }
    });
  }
  return errors;
}

module.exports = { compare };
