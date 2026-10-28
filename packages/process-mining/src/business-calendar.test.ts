import { expect, it } from 'vitest';
import {
  createDurationClock,
  DEFAULT_WORK_CALENDAR,
  addWorkingMinutes,
  isTimePolicy,
} from './business-calendar';
const t = (s: string) => Date.parse(s + '+07:00');
const clock = createDurationClock({ basis: 'working', calendar: DEFAULT_WORK_CALENDAR });
it('excludes lunch, nights and weekends without altering timestamps', () => {
  expect(clock(t('2026-10-05T08:00:00'), t('2026-10-19T08:00:00')) / 3600000).toBe(80);
  expect(clock(t('2026-10-09T16:00:00'), t('2026-10-12T09:00:00')) / 3600000).toBe(2);
  expect(clock(t('2026-10-05T11:30:00'), t('2026-10-05T13:30:00')) / 60000).toBe(60);
  expect(clock(t('2026-10-10T08:00:00'), t('2026-10-11T17:00:00'))).toBe(0);
});
it('schedules work across holidays and validates overlapping shifts', () => {
  const calendar = { ...DEFAULT_WORK_CALENDAR, holidays: ['2026-10-12'] };
  const start = t('2026-10-09T16:00:00');
  const end = addWorkingMinutes(start, 120, calendar);
  expect(new Date(end).toISOString()).toBe('2026-10-13T02:00:00.000Z');
  expect(createDurationClock({ basis: 'working', calendar })(start, end) / 60000).toBe(
    120,
  );
  expect(
    isTimePolicy({
      basis: 'working',
      calendar: {
        ...calendar,
        shifts: [
          { startMinute: 480, endMinute: 800 },
          { startMinute: 700, endMinute: 900 },
        ],
      },
    }),
  ).toBe(false);
  expect(
    isTimePolicy({
      basis: 'working',
      calendar: { ...calendar, holidays: ['2026-02-30'] },
    }),
  ).toBe(false);
});
it('keeps elapsed mode compatible and counts long intervals without day loops', () => {
  expect(createDurationClock()(0, 3600000)).toBe(3600000);
  expect(clock(t('2026-10-19T08:00:00'), t('2026-10-05T08:00:00'))).toBe(0);
  const start = t('2000-01-03T08:00:00');
  const end = addWorkingMinutes(start, 10000);
  expect(clock(start, end) / 60000).toBe(10000);
});
