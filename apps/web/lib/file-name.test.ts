import { describe, expect, it } from 'vitest';

import { safeFileStem } from './file-name';

describe('safeFileStem', () => {
  it('preserves Vietnamese names while removing path characters', () => {
    expect(safeFileStem('Phân tích / quy trình: tuần 3')).toBe(
      'Phân tích quy trình tuần 3',
    );
  });

  it('uses a fallback for an empty or reserved Windows name', () => {
    expect(safeFileStem('***', 'process')).toBe('process');
    expect(safeFileStem('CON')).toBe('_CON');
  });
});
