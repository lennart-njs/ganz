import type { Metadata, Viewport } from 'next';

import { de } from '@/i18n/de';

import { themeCss } from '../lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: `${de.portal.title} · ${de.portal.brand}`,
  icons: { icon: '/favicon.svg' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
