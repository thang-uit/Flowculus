'use client';

import { CaretDown, List } from '@phosphor-icons/react';
import { useActiveTopic } from '@/lib/knowledge/use-active-topic';

import { KNOWLEDGE_CATEGORIES } from '@/lib/knowledge/catalog';
import type { KnowledgeArticle } from '@/lib/knowledge/types';
import { getReadingCopy } from '@/lib/i18n/knowledge/copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function KnowledgeContents({
  articles,
}: Readonly<{ articles: KnowledgeArticle[] }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getReadingCopy(locale);
  const { active, setActive } = useActiveTopic(articles[0]?.id ?? '');
  const items = (close?: () => void) => (
    <nav aria-label={copy.contents}>
      {KNOWLEDGE_CATEGORIES.map((category) => (
        <div className="knowledge-contents-group" key={category}>
          <p>{copy.categories[category]}</p>
          <ul>
            {articles
              .filter((article) => article.category === category)
              .map((article) => (
                <li key={article.id}>
                  <a
                    href={`#${article.id}`}
                    aria-current={active === article.id ? 'location' : undefined}
                    onClick={() => {
                      setActive(article.id);
                      close?.();
                      requestAnimationFrame(() =>
                        document
                          .getElementById(article.id)
                          ?.focus({ preventScroll: true }),
                      );
                    }}
                  >
                    {article.title}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <>
      <aside className="knowledge-contents-desktop">
        <div className="knowledge-contents-heading">
          <List size={17} aria-hidden="true" />
          {copy.contents}
        </div>
        {items()}
      </aside>
      <details className="knowledge-contents-mobile">
        <summary>
          <List size={17} aria-hidden="true" />
          {copy.contents}
          <CaretDown size={15} aria-hidden="true" />
        </summary>
        {items(() =>
          document
            .querySelector<HTMLDetailsElement>('.knowledge-contents-mobile')
            ?.removeAttribute('open'),
        )}
      </details>
    </>
  );
}
