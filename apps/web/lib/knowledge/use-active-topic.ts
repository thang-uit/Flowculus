'use client';

import { useEffect, useState } from 'react';
import { findActiveTopic } from './active-topic';

/** Keep all intersecting articles, since observer callbacks contain only changed entries. */
export function useActiveTopic(firstId: string) {
  const [active, setActive] = useState(firstId);
  useEffect(() => {
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        const viewport = entries[0]?.rootBounds;
        if (!viewport) return;
        const next = findActiveTopic(
          [...visible].map((article) => {
            const { top, bottom } = article.getBoundingClientRect();
            return { id: article.id, top, bottom };
          }),
          viewport,
        );
        if (next) setActive(next);
      },
      { rootMargin: '-100px 0px -60% 0px' },
    );
    document
      .querySelectorAll('.knowledge-article')
      .forEach((article) => observer.observe(article));
    return () => observer.disconnect();
  }, []);
  return { active, setActive };
}
