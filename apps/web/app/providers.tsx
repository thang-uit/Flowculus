'use client';

import { ThemeProvider } from 'next-themes';
import { useEffect } from 'react';

import { ToastViewport } from '@/components/ui/ToastViewport';
import { PageTitle } from '@/components/site/PageTitle';
import { restoreLocalePreference } from '@/lib/use-preferences-store';

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    restoreLocalePreference();
    const syncPreferences = (event: StorageEvent) => {
      if (
        event.key === 'flowculus-locale' ||
        event.key === 'flowculus-minimap' ||
        event.key === null
      )
        restoreLocalePreference();
    };
    window.addEventListener('storage', syncPreferences);
    return () => window.removeEventListener('storage', syncPreferences);
  }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PageTitle />
      {children}
      <ToastViewport />
    </ThemeProvider>
  );
}
