import type { Metadata, Viewport } from 'next';

import '@fontsource-variable/plus-jakarta-sans/wght.css';

import '@xyflow/react/dist/base.css';

import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Canvas | Flowculus',
  applicationName: 'Flowculus',
  description:
    'Draw process models, calculate cycle time and explain every formula. Vẽ quy trình, tính thời gian chu trình và giải thích công thức.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Flowculus',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/apple-icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#15181b' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
