// Katalog auf dem Server (Entscheidung 24). Liest freigegebene Einträge aus server/guides/catalog/*.json.
// Entwürfe aus dem Import liegen in server/guides/drafts/ und zählen erst nach der Freigabe
// (scripts/guides-approve.mjs verschiebt sie hierher). Nur auf dem Server, nie im App-Bundle.
import fs from 'node:fs';
import path from 'node:path';

import { registerCatalogEntry, validateCatalogEntry } from '@/lib/guideCatalog';
import type { GuideCatalogEntry } from '@/model/types';

export const CATALOG_DIR = path.join(process.cwd(), 'server', 'guides', 'catalog');

let loaded = false;

/** Liest die freigegebenen Einträge einmal ein. Fehlerhafte Dateien werden übersprungen und gemeldet. */
export function loadApprovedCatalog(dir = CATALOG_DIR, force = false): GuideCatalogEntry[] {
  if (loaded && !force) return [];
  loaded = true;
  if (!fs.existsSync(dir)) return [];
  const added: GuideCatalogEntry[] = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    try {
      const entry = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as GuideCatalogEntry;
      const errors = validateCatalogEntry(entry);
      if (errors.length) {
        console.warn(`Katalog ${file} übersprungen: ${errors.join('; ')}`);
        continue;
      }
      if (registerCatalogEntry(entry)) added.push(entry);
    } catch (error) {
      // Nur die Fehlerart: Die Meldung von JSON.parse zitiert den Inhalt der Datei
      console.warn(
        `Katalog ${file} nicht lesbar: ${error instanceof Error ? error.name : typeof error}`,
      );
    }
  }
  return added;
}
