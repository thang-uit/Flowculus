import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Flowculus | Cycle-time analysis workspace',
    short_name: 'Flowculus',
    description:
      'Draw process models, calculate cycle time and explain every formula. Vẽ quy trình, tính thời gian chu trình và giải thích công thức.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f5f7',
    theme_color: '#d09a14',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    lang: 'en',
    dir: 'ltr',
  };
}
