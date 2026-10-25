import type { Locale } from '@/lib/i18n/types';

const TITLES = {
  en: {
    '/': 'Canvas',
    '/mining': 'Process mining',
    '/knowledge': 'Knowledge',
    '/about': 'About',
  },
  vi: {
    '/': 'Mô hình quy trình',
    '/mining': 'Khai phá quy trình',
    '/knowledge': 'Kiến thức',
    '/about': 'Dự án',
  },
} as const;
export function pageTitle(pathname: string, locale: Locale): string {
  const title = TITLES[locale][pathname as keyof typeof TITLES.en];
  return title ? `${title} | Flowculus` : 'Flowculus';
}
