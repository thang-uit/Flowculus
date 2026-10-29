import { describe, expect, it } from 'vitest';

import { getKnowledgeArticles, KNOWLEDGE_ENTRIES, searchKnowledge } from './catalog';
import { NOTATION_COPY } from '@/lib/i18n/knowledge/notation';
import { KNOWLEDGE_MATH } from './math-expressions';
import { analyzeReworkExample } from './rework-example';

describe('knowledge catalog', () => {
  it('has stable unique anchors and complete bilingual content', () => {
    expect(new Set(KNOWLEDGE_ENTRIES.map((entry) => entry.id)).size).toBe(
      KNOWLEDGE_ENTRIES.length,
    );
    for (const locale of ['en', 'vi'] as const)
      for (const article of getKnowledgeArticles(locale)) {
        expect(article.id).toMatch(/^[a-z][a-z0-9-]+$/);
        expect(article.title).not.toBe('');
        expect(article.summary).not.toBe('');
        expect(article.blocks.length).toBeGreaterThan(1);
        for (const block of article.blocks)
          if (block.kind === 'formula') {
            expect(KNOWLEDGE_MATH[block.mathId].length).toBeGreaterThan(0);
            expect(block.note).not.toBe('');
          }
      }
  });
  it('keeps table columns and localized teaching structure consistent', () => {
    for (const entry of KNOWLEDGE_ENTRIES) {
      expect(entry.content.vi.blocks.map((block) => block.kind)).toEqual(
        entry.content.en.blocks.map((block) => block.kind),
      );
      for (const content of Object.values(entry.content))
        for (const block of content.blocks)
          if (block.kind === 'table') {
            expect(block.headers.length).toBeGreaterThan(1);
            for (const row of block.rows) expect(row).toHaveLength(block.headers.length);
          }
    }
  });
  it('searches accents, Vietnamese đ and English synonyms across both locales', () => {
    expect(
      searchKnowledge('thoi gian chu trinh', 'vi').map((article) => article.id),
    ).toContain('ct-tct-cte');
    expect(searchKnowledge('điểm nghẽn', 'en').map((article) => article.id)).toContain(
      'bottlenecks',
    );
    expect(searchKnowledge('rework', 'vi').map((article) => article.id)).toContain(
      'rework',
    );
    expect(searchKnowledge('ngu giac', 'en').map((article) => article.id)).toContain(
      'bpmn',
    );
    expect(searchKnowledge('   ', 'en')).toEqual([]);
    expect(searchKnowledge('<script>invalid</script>', 'en')).toEqual([]);
  });
});

describe('rework teaching example', () => {
  it('uses the engine to distinguish one redo from repeated attempts', () => {
    expect(analyzeReworkExample(120, 0.5, 'once').cycleTimeMinutes).toBeCloseTo(180);
    expect(analyzeReworkExample(120, 0.5, 'unlimited').cycleTimeMinutes).toBeCloseTo(240);
    for (const policy of ['once', 'unlimited'] as const)
      expect(analyzeReworkExample(120, 0, policy).cycleTimeMinutes).toBeCloseTo(120);
    expect(() => analyzeReworkExample(120, 1, 'unlimited')).toThrow(RangeError);
    expect(() => analyzeReworkExample(NaN, 0.5, 'once')).toThrow(RangeError);
  });
  it('keeps numerical examples consistent at the teaching controls’ boundaries', () => {
    for (const duration of [15, 120, 240])
      for (const probability of [0, 0.5, 0.9]) {
        expect(
          analyzeReworkExample(duration, probability, 'once').cycleTimeMinutes,
        ).toBeCloseTo(duration * (1 + probability));
        expect(
          analyzeReworkExample(duration, probability, 'unlimited').cycleTimeMinutes,
        ).toBeCloseTo(duration / (1 - probability));
      }
  });
});

it('documents every notation with meaning and an explicit support boundary in both languages', () => {
  expect(NOTATION_COPY.en.rows.map((row) => row.kind)).toEqual(
    NOTATION_COPY.vi.rows.map((row) => row.kind),
  );
  for (const locale of ['en', 'vi'] as const) {
    expect(NOTATION_COPY[locale].rows).toHaveLength(16);
    for (const row of NOTATION_COPY[locale].rows) {
      expect(row.meaning).not.toBe('');
      expect(row.support).not.toBe('');
    }
  }
});
