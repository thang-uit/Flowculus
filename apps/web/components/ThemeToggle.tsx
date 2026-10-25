// Lucian UX/UI Prompt #021 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#021
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useSyncExternalStore } from 'react';

import { Tooltip } from '@/components/ui/Tooltip';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const STARS = [
  { left: 30, top: 20, delay: 0, size: 4 },
  { left: 58, top: 56, delay: -0.6, size: 3 },
  { left: 86, top: 26, delay: -1.2, size: 4 },
  { left: 44, top: 72, delay: -1.8, size: 3 },
  { left: 110, top: 60, delay: -0.9, size: 2 },
  { left: 20, top: 46, delay: -1.5, size: 2 },
] as const;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const frameIds = useRef<number[]>([]);
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === 'dark';

  useEffect(
    () => () => {
      frameIds.current.forEach((frameId) => window.cancelAnimationFrame(frameId));
      delete document.documentElement.dataset.themeSwitching;
    },
    [],
  );

  const switchTheme = () => {
    const root = document.documentElement;
    frameIds.current.forEach((frameId) => window.cancelAnimationFrame(frameId));
    frameIds.current = [];
    root.dataset.themeSwitching = 'true';
    setTheme(isDark ? 'light' : 'dark');
    frameIds.current.push(
      window.requestAnimationFrame(() => {
        frameIds.current.push(
          window.requestAnimationFrame(() => {
            delete root.dataset.themeSwitching;
            frameIds.current = [];
          }),
        );
      }),
    );
  };

  return (
    <Tooltip content={isDark ? copy.useLightTheme : copy.useDarkTheme}>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={copy.darkThemeSwitch}
        title={isDark ? copy.useLightTheme : copy.useDarkTheme}
        onClick={switchTheme}
        className={isDark ? 'ux u021 is-night' : 'ux u021'}
      >
        <span className="u021-sky" aria-hidden="true">
          <span className="u021-halo">
            <i />
            <i />
            <i />
          </span>
          <span className="u021-stars">
            {STARS.map(({ left, top, delay, size }) => (
              <i
                key={`${left}-${top}`}
                style={{
                  left,
                  top,
                  width: size,
                  height: size,
                  animationDelay: `${delay}s`,
                }}
              />
            ))}
          </span>
          <span className="u021-clouds">
            <i />
            <i />
          </span>
          <span className="u021-knob">
            <span className="u021-moon">
              <i />
              <i />
              <i />
            </span>
          </span>
        </span>
      </button>
    </Tooltip>
  );
}
