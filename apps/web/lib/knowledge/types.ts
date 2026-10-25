import type { KnowledgeFormulaId } from './math-expressions';
import type { Locale } from '@/lib/i18n/types';

export type KnowledgeCategory = 'basics' | 'analysis' | 'mining' | 'workflow';
export type DiagramKind =
  'request' | 'sequence' | 'xor' | 'and' | 'rework-once' | 'rework-loop' | 'mining';

export type KnowledgeBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'notation' }
  | {
      kind: 'formula';
      mathId: KnowledgeFormulaId;
      label: string;
      expression: string;
      note: string;
    }
  | { kind: 'list'; items: string[] }
  | { kind: 'notice'; text: string }
  | { kind: 'example'; title: string; text: string }
  | { kind: 'diagram'; diagram: DiagramKind; caption: string }
  | { kind: 'table'; headers: string[]; rows: string[][] };

export interface KnowledgeContent {
  title: string;
  summary: string;
  keywords: string[];
  blocks: KnowledgeBlock[];
}

export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  content: Record<Locale, KnowledgeContent>;
}

export interface KnowledgeArticle extends KnowledgeContent {
  id: string;
  category: KnowledgeCategory;
}
