import { describe, expect, it } from 'vitest';

import { detectTraceDurations } from './detect-duration';
import type { TraceCandidate } from './trace-types';

const GLYPHS: Record<string, string[]> = {
  '0': ['11111', '10001', '10011', '10101', '11001', '10001', '11111'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['11110', '00001', '00001', '11110', '10000', '10000', '11111'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  h: ['10000', '10000', '10110', '11001', '10001', '10001', '10001'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00000', '00100'],
  ',': ['00000', '00000', '00000', '00000', '00000', '00100', '01000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function sample(text: string) {
  const cols = 400;
  const rows = 100;
  const data = new Uint8Array(cols * rows);
  [...text].forEach((glyph, index) => {
    GLYPHS[glyph].forEach((row, y) => {
      [...row].forEach((value, x) => {
        if (value !== '1') return;
        for (let dy = 0; dy < 4; dy++)
          for (let dx = 0; dx < 4; dx++)
            data[(30 + y * 4 + dy) * cols + 30 + index * 24 + x * 4 + dx] = 255;
      });
    });
  });
  const binary = { cols, rows, data };
  const candidate: TraceCandidate = {
    id: 'task',
    kind: 'task',
    shape: 'rectangle',
    label: '',
    confidence: 1,
    bounds: { x: 0, y: 0, width: 400, height: 100 },
  };
  return { binary, candidate };
}

describe('conservative image duration recognition', () => {
  it.each(['2.5h', '2,5h', '-2h', '12 5h', '100001h'])(
    'does not turn unsupported %s notation into an integer-hour value',
    (label) => {
      const { binary, candidate } = sample(label);
      expect(detectTraceDurations(binary, [candidate])[0]).not.toHaveProperty(
        'processingMinutes',
      );
    },
  );

  it.each([
    ['0h', 0],
    ['12h', 720],
    ['10000h', 600000],
  ] as const)('recognises the complete supported %s label', (label, minutes) => {
    const { binary, candidate } = sample(label);
    expect(detectTraceDurations(binary, [candidate])[0].processingMinutes).toBe(minutes);
  });
});
