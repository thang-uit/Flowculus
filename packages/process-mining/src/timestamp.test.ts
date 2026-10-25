import { describe, expect, it } from 'vitest';

import { parseTimestamp } from './timestamp';

describe('strict mining timestamps', () => {
  it.each([
    '2026-02-29',
    '2026-04-31',
    '31/02/2026',
    '2026-10-01T25:00:00Z',
    '2026-10-01T24:01:00Z',
    '2026-10-01T08:60:00Z',
    '2026-10-01T08:00:60Z',
    '2026-10-01T08:00:00+24:00',
    '2026-10-01T08:00:00+07:60',
    '01/10/2026 00:30 pm',
    '01/10/2026 13:30 am',
    'October 1, 2026 08:00',
  ])('rejects an invalid or ambiguous timestamp: %s', (raw) => {
    expect(parseTimestamp(raw)).toBeNull();
  });

  it('accepts leap days and exact ISO end-of-day midnight', () => {
    expect(parseTimestamp('2024-02-29')).toBe(Date.UTC(2024, 1, 29));
    expect(parseTimestamp('2026-10-01T24:00:00Z')).toBe(Date.UTC(2026, 9, 2));
    expect(parseTimestamp('2026-10-01T08:00:00.9999Z')).toBe(
      Date.UTC(2026, 9, 1, 8, 0, 0, 999),
    );
    expect(parseTimestamp('01/10/2026 12:30 am')).toBe(Date.UTC(2026, 9, 1, 0, 30));
  });
});
