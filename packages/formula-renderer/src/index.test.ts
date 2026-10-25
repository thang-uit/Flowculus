import { describe, expect, it } from 'vitest';

import { formulaToLatex, formulaToText } from './index';

describe('formulaToText', () => {
  it('renders weighted branches and parallel maxima as readable text', () => {
    const formula = formulaToText({
      kind: 'sum',
      terms: [
        { kind: 'literal', value: 'T_A' },
        {
          kind: 'maximum',
          terms: [
            { kind: 'literal', value: 'T_B' },
            {
              kind: 'weighted',
              probability: { kind: 'literal', value: 'p_C' },
              term: { kind: 'literal', value: 'T_C' },
            },
          ],
        },
      ],
    });

    expect(formula).toBe('T_A + max(T_B, (p_C × T_C))');
  });

  it('renders shared-join corrections in text and LaTeX', () => {
    const formula = {
      kind: 'difference' as const,
      minuend: {
        kind: 'sum' as const,
        terms: [
          { kind: 'literal' as const, value: 'T_A' },
          { kind: 'literal' as const, value: 'T_B' },
        ],
      },
      subtrahend: { kind: 'literal' as const, value: 'T_join' },
    };

    expect(formulaToText(formula)).toBe('(T_A + T_B) - (T_join)');
    expect(formulaToLatex(formula)).toContain('T_join');
  });

  it('groups an entire branch after its XOR probability', () => {
    const branch = {
      kind: 'weighted' as const,
      probability: { kind: 'literal' as const, value: '0.7' },
      term: {
        kind: 'sum' as const,
        terms: [
          { kind: 'literal' as const, value: '180' },
          {
            kind: 'maximum' as const,
            terms: [
              { kind: 'literal' as const, value: '600' },
              { kind: 'literal' as const, value: '1320' },
            ],
          },
        ],
      },
    };
    expect(formulaToText(branch)).toBe('(0.7 × (180 + max(600, 1320)))');
    expect(formulaToLatex(branch)).toContain('\\left(180 + \\max');
  });
});

it('preserves product grouping when copying a sum as a factor', () => {
  const product = {
    kind: 'product',
    factors: [
      {
        kind: 'sum',
        terms: [
          { kind: 'literal', value: 'a' },
          { kind: 'literal', value: 'b' },
        ],
      },
      { kind: 'literal', value: 'c' },
    ],
  } as const;
  expect(
    formulaToText({
      ...product,
      factors: [...product.factors].map((factor) =>
        factor.kind === 'sum' ? { ...factor, terms: [...factor.terms] } : factor,
      ),
    }),
  ).toBe('(a + b) × c');
});
