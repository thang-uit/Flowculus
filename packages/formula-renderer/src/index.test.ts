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
});
