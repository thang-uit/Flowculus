'use client';

import { useEffect, useState } from 'react';

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
        const first = [...visible].sort(
          (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
        )[0];
        if (first) setActive(first.id);
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
