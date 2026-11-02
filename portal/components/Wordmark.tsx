// Wortmarke und Zeichen von mach’s aus den Logo-Dateien (wie auf machs.io), Farbe aus currentColor.
import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), 'public', file), 'utf8');

export const wordmarkSvg = read('wordmark.svg');
/** Das Zeichen „m’“ für die kleine Kapsel */
export const zeichenSvg = read('zeichen.svg');

export function Wordmark({ className }: { className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: wordmarkSvg }} />;
}
