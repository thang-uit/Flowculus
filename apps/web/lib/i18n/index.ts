import { EN } from './en';
import type { Locale, WorkspaceCopy } from './types';
import { VI } from './vi';

export type { Locale, WorkspaceCopy } from './types';

/** English is the default locale; every key has an English and a Vietnamese value. */
export const getWorkspaceCopy = (locale: Locale): WorkspaceCopy =>
  locale === 'vi' ? VI : EN;
