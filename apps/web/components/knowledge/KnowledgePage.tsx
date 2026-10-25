'use client';

import { ArrowRight, ArrowUp } from '@phosphor-icons/react';

import { ReadingShell } from '@/components/site/ReadingShell';
import { WorkspaceLink } from '@/components/site/WorkspaceLink';
import { SectionErrorBoundary } from '@/components/ui/SectionErrorBoundary';
import { getReadingCopy } from '@/lib/i18n/knowledge/copy';
import { getKnowledgeArticles, KNOWLEDGE_CATEGORIES } from '@/lib/knowledge/catalog';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { KnowledgeArticle } from './KnowledgeArticle';
import { KnowledgeContents } from './KnowledgeContents';
import { KnowledgeSearch } from './KnowledgeSearch';
import { ReworkLesson } from './ReworkLesson';

export function KnowledgePage() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getReadingCopy(locale);
  const articles = getKnowledgeArticles(locale);
  return (
    <ReadingShell page="knowledge">
      <div className="knowledge-layout">
        <KnowledgeContents articles={articles} />
        <main id="reading-main" className="knowledge-main">
          <header className="knowledge-intro">
            <h1>{copy.title}</h1>
            <p>{copy.introduction}</p>
            <WorkspaceLink href="/" className="reading-text-link">
              {copy.model}
              <ArrowRight size={16} aria-hidden="true" />
            </WorkspaceLink>
            <KnowledgeSearch />
          </header>
          <aside className="knowledge-source-note">
            <h2>{copy.sourceTitle}</h2>
            <p>{copy.sourceText}</p>
          </aside>
          {KNOWLEDGE_CATEGORIES.map((category) => (
            <section
              key={category}
              className="knowledge-category"
              aria-label={copy.categories[category]}
            >
              <div className="knowledge-category-label">{copy.categories[category]}</div>
              {articles
                .filter((article) => article.category === category)
                .map((article) => (
                  <KnowledgeArticle
                    key={article.id}
                    article={article}
                    categoryLabel={copy.categories[category]}
                  >
                    {article.id === 'rework' ? (
                      <SectionErrorBoundary section="analysis">
                        <ReworkLesson />
                      </SectionErrorBoundary>
                    ) : null}
                  </KnowledgeArticle>
                ))}
            </section>
          ))}
          <section className="knowledge-sources" id="sources">
            <h2>{copy.sources}</h2>
            <ul>
              <li>
                Dumas, La Rosa, Mendling &amp; Reijers.{' '}
                <em>Fundamentals of Business Process Management</em>, {copy.bookEdition},{' '}
                {copy.chapterSeven}.
              </li>
              <li>
                W. M. P. van der Aalst. <em>Process Mining: Data Science in Action</em>,
                {copy.bookEdition}.
              </li>
              <li>
                <a
                  href="https://www.omg.org/spec/BPMN/2.0.2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  OMG BPMN 2.0.2
                </a>{' '}
                ·{' '}
                <a
                  href="https://github.com/thang-uit/Flowculus/tree/main/packages/analysis-engine"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.analysisSource}
                </a>
              </li>
            </ul>
            <a className="reading-text-link" href="#reading-top">
              {copy.backTop}
              <ArrowUp size={16} aria-hidden="true" />
            </a>
          </section>
        </main>
      </div>
    </ReadingShell>
  );
}
