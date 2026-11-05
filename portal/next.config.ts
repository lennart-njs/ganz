import path from 'node:path';

import type { NextConfig } from 'next';

import { securityHeaders } from './lib/securityHeaders';

// Das Portal nutzt Typen, Texte und Farben aus dem App-Repo (model/, i18n/, theme/, config/).
const config: NextConfig = {
  turbopack: { root: path.join(__dirname, '..') },
  poweredByHeader: false,
  // Kein Entwickler-Knopf im Bild, auch nicht in der Demo mit `next dev`
  devIndicators: false,
  // CSP, kein Einbetten in fremde Seiten, keine Kamera und kein Mikrofon (lib/securityHeaders.ts)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders(process.env.NODE_ENV !== 'production'),
      },
    ];
  },
};

export default config;
