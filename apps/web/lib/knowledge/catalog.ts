import type { Locale } from '@/lib/i18n/types';
import { BASICS } from '@/lib/i18n/knowledge/basics';
import { ANALYSIS } from '@/lib/i18n/knowledge/analysis';
import { MINING } from '@/lib/i18n/knowledge/mining';
import { NOTATION_COPY } from '@/lib/i18n/knowledge/notation';
import { DOCUMENTS } from '@/lib/i18n/knowledge/documents';
import { WORKFLOW } from '@/lib/i18n/knowledge/workflow';
import type { KnowledgeArticle, KnowledgeBlock, KnowledgeCategory } from './types';

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  'basics',
  'analysis',
  'mining',
  'workflow',
];
export const KNOWLEDGE_ENTRIES = [
  ...BASICS,
  ...ANALYSIS,
  ...MINING,
  ...DOCUMENTS,
  ...WORKFLOW,
];

export const getKnowledgeArticles = (locale: Locale): KnowledgeArticle[] =>
  KNOWLEDGE_ENTRIES.map(({ id, category, content }) => ({
    id,
    category,
    ...content[locale],
  }));

export const normalizeKnowledgeQuery = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

const blockText = (block: KnowledgeBlock): string => {
  switch (block.kind) {
    case 'notation':
      return Object.values(NOTATION_COPY)
        .flatMap((copy) =>
          copy.rows.map((row) => `${row.label} ${row.meaning} ${row.support}`),
        )
        .join(' ');
    case 'paragraph':
    case 'heading':
    case 'notice':
      return block.text;
    case 'formula':
      return `${block.label} ${block.expression} ${block.note}`;
    case 'list':
      return block.items.join(' ');
    case 'example':
      return `${block.title} ${block.text}`;
    case 'diagram':
      return block.caption;
    case 'table':
      return `${block.headers.join(' ')} ${block.rows.flat().join(' ')}`;
  }
};

// A small static bilingual index; no external service, HTML injection or fuzzy-search dependency.
const SEARCH_INDEX = KNOWLEDGE_ENTRIES.map((entry) => ({
  id: entry.id,
  titles: normalizeKnowledgeQuery(`${entry.content.en.title} ${entry.content.vi.title}`),
  text: normalizeKnowledgeQuery(
    Object.values(entry.content)
      .map((content) =>
        [
          content.title,
          content.summary,
          ...content.keywords,
          ...content.blocks.map(blockText),
        ].join(' '),
      )
      .join(' '),
  ),
}));

export function searchKnowledge(query: string, locale: Locale): KnowledgeArticle[] {
  const terms = normalizeKnowledgeQuery(query.slice(0, 160)).split(' ').filter(Boolean);
  if (!terms.length) return [];
  const articles = getKnowledgeArticles(locale);
  return SEARCH_INDEX.filter((entry) => terms.every((term) => entry.text.includes(term)))
    .map((entry) => ({
      entry,
      score: terms.filter((term) => entry.titles.includes(term)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .flatMap(({ entry }) => articles.filter((article) => article.id === entry.id));
}
