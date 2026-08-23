'use client';

import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { Tooltip } from '@/components/ui/Tooltip';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === 'dark';
  const switchTheme = () => {
    const root = document.documentElement;
    root.dataset.themeSwitching = 'true';
    setTheme(isDark ? 'light' : 'dark');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        delete root.dataset.themeSwitching;
      });
    });
  };

  const Icon = isDark ? Sun : Moon;

  return (
    <Tooltip content={isDark ? copy.useLightTheme : copy.useDarkTheme}>
      <button
        type="button"
        aria-label={isDark ? copy.useLightTheme : copy.useDarkTheme}
        title={isDark ? copy.useLightTheme : copy.useDarkTheme}
        aria-pressed={isDark}
        onClick={switchTheme}
        className="focus-ring tb-btn tb-btn--idle"
      >
        <Icon size={15} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
