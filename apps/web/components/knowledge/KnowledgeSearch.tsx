'use client';

import { ArrowDown, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useId, useMemo, useRef, useState } from 'react';

import { getReadingCopy } from '@/lib/i18n/knowledge/copy';
import { searchKnowledge } from '@/lib/knowledge/catalog';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function KnowledgeSearch() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getReadingCopy(locale);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const results = useMemo(() => searchKnowledge(query, locale), [query, locale]);
  const searching = query.trim().length > 0;
  return (
    <section className="knowledge-search" aria-label={copy.search}>
      <label htmlFor={id} className="sr-only">
        {copy.search}
      </label>
      <div className="knowledge-search-field">
        <MagnifyingGlass size={21} aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="search"
          value={query}
          maxLength={160}
          autoComplete="off"
          placeholder={copy.searchHint}
          aria-describedby={`${id}-status`}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setQuery('');
          }}
        />
        {searching ? (
          <button
            type="button"
            className="focus-ring"
            aria-label={copy.clear}
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <X size={17} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <p
        id={`${id}-status`}
        role="status"
        className={searching ? 'knowledge-search-status' : 'sr-only'}
      >
        {searching ? copy.results(results.length) : ''}
      </p>
      {searching ? (
        results.length > 0 ? (
          <ul className="knowledge-search-results">
            {results.map((article) => (
              <li key={article.id}>
                <a
                  className="focus-ring"
                  href={`#${article.id}`}
                  onClick={() =>
                    document.getElementById(article.id)?.focus({ preventScroll: true })
                  }
                >
                  <span>
                    <strong>{article.title}</strong>
                    <small>{article.summary}</small>
                  </span>
                  <ArrowDown size={16} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="knowledge-search-empty">{copy.empty}</p>
        )
      ) : null}
    </section>
  );
}
