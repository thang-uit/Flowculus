import { describe, expect, it } from 'vitest';

import { formatDurationMs, formatPercent } from './format';

describe('formatDurationMs', () => {
  it('uses the selected locale for decimal values and units', () => {
    expect(formatDurationMs(90 * 60 * 1000, 'en')).toBe('1.5h');
    expect(formatDurationMs(90 * 60 * 1000, 'vi')).toBe('1,5 giờ');
  });

  it('normalizes rounded day boundaries instead of producing 24 hours', () => {
    expect(formatDurationMs(59_900, 'en')).toBe('1m');
    expect(formatDurationMs(59.9 * 60_000, 'vi')).toBe('1 giờ');
    expect(formatDurationMs(23.99 * 60 * 60 * 1000, 'en')).toBe('1d');
    expect(formatDurationMs(24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000, 'vi')).toBe(
      '1 ngày 4 giờ',
    );
  });

  it('rejects invalid and negative durations', () => {
    expect(formatDurationMs(Number.NaN, 'vi')).toBe('–');
    expect(formatDurationMs(-1, 'en')).toBe('–');
  });
});

describe('formatPercent', () => {
  it('localizes decimal punctuation without changing the ratio', () => {
    expect(formatPercent(0.594, 1, 'en')).toBe('59.4%');
    expect(formatPercent(0.594, 1, 'vi')).toBe('59,4%');
    expect(formatPercent(0.6, 0, 'vi')).toBe('60%');
  });

  it('withholds invalid numbers', () => {
    expect(formatPercent(Number.NaN, 1, 'vi')).toBeNull();
  });
});
