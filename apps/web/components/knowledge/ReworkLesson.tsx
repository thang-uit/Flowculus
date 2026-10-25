'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { getReadingCopy } from '@/lib/i18n/knowledge/copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const ReworkPlayground = dynamic(
  () => import('./ReworkPlayground').then((module) => module.ReworkPlayground),
  { ssr: false },
);

/** Load the calculation example only when the reader approaches that chapter. */
export function ReworkLesson() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getReadingCopy(locale);
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: '320px' },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={hostRef} className="knowledge-lesson">
      {visible ? <ReworkPlayground /> : <p>{copy.playgroundLoading}</p>}
    </div>
  );
}
