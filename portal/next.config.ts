import path from 'node:path';

import type { NextConfig } from 'next';

// Das Portal nutzt Typen, Texte und Farben aus dem App-Repo (model/, i18n/, theme/, config/).
const config: NextConfig = {
  turbopack: { root: path.join(__dirname, '..') },
  poweredByHeader: false,
};

export default config;
