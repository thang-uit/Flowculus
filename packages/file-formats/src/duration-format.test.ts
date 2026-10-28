import { expect, it } from 'vitest';
import { formatCompactMinutes } from './svg';
it('keeps model durations in hours beyond one day without assuming a working day length', () => {
  expect(formatCompactMinutes(58)).toBe('58m');
  expect(formatCompactMinutes(1440)).toBe('24h');
  expect(formatCompactMinutes(2976)).toBe('49.6h');
  expect(formatCompactMinutes(-1500)).toBe('-25h');
  expect(formatCompactMinutes(NaN)).toBe('–');
});
