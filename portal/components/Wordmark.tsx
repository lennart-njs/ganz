// Wortmarke mach’s aus der Logo-Datei (wie auf machs.io), Farbe aus currentColor.
import fs from 'node:fs';
import path from 'node:path';

const svg = fs.readFileSync(path.join(process.cwd(), 'public', 'wordmark.svg'), 'utf8');

export function Wordmark({ className }: { className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}
