// CSS-Variablen aus den Markenfarben (theme/machs.ts). Hell als Standard, dunkel folgt dem System.
import { machs, type MachsColor } from '@/theme/machs';

const kebab = (k: string) => k.replace(/[A-Z0-9]/g, (c) => `-${c.toLowerCase()}`);

function vars(scheme: 'light' | 'dark') {
  return (Object.keys(machs[scheme]) as MachsColor[])
    .map((k) => `--${kebab(k)}:${machs[scheme][k]}`)
    .join(';');
}

export const themeCss = `:root{${vars('light')};color-scheme:light}@media (prefers-color-scheme:dark){:root{${vars('dark')};color-scheme:dark}}`;
