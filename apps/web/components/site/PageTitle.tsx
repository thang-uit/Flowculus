'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { pageTitle } from '@/lib/page-title';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function PageTitle() {
  const pathname = usePathname();
  const locale = usePreferencesStore((state) => state.locale);
  useEffect(() => {
    const title = pageTitle(pathname, locale);
    const sync = () => {
      if (document.title !== title) document.title = title;
    };
    // Next may stream static metadata after hydration. Keep the chosen locale
    // authoritative without observing the workspace or retaining routed editors.
    const observer = new MutationObserver(sync);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    sync();
    return () => observer.disconnect();
  }, [pathname, locale]);
  return null;
}
