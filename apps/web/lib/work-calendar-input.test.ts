import { expect, it } from 'vitest';
import { parseWorkCalendarDraft } from './work-calendar-input';
const draft = {
  offset: '420',
  days: '1,2,3,4,5',
  shifts: '13:00-17:00, 08:00-12:00',
  holidays: '',
};
it('sorts valid shifts and identifies the first invalid calendar field', () => {
  expect(parseWorkCalendarDraft(draft)).toMatchObject({
    ok: true,
    calendar: {
      shifts: [
        { startMinute: 480, endMinute: 720 },
        { startMinute: 780, endMinute: 1020 },
      ],
    },
  });
  for (const [key, value] of [
    ['offset', '900'],
    ['days', '1,1'],
    ['shifts', '08:00-13:00,12:00-17:00'],
    ['holidays', '2026-02-30'],
  ] as const)
    expect(parseWorkCalendarDraft({ ...draft, [key]: value })).toEqual({
      ok: false,
      field: key,
    });
});

import { useMiningStore } from './mining-store';
import { DEFAULT_WORK_CALENDAR } from '@flowculus/process-mining';
it('retains the configured calendar across working and elapsed clocks', () => {
  const original = useMiningStore.getState();
  try {
    const calendar = { ...DEFAULT_WORK_CALENDAR, holidays: ['2026-10-12'] };
    original.setTimePolicy({ basis: 'working', calendar });
    original.setTimePolicy({ basis: 'elapsed' });
    expect(useMiningStore.getState().workCalendar).toEqual(calendar);
    original.setTimePolicy({
      basis: 'working',
      calendar: useMiningStore.getState().workCalendar,
    });
    expect(useMiningStore.getState().timePolicy).toEqual({ basis: 'working', calendar });
  } finally {
    useMiningStore.setState({
      timePolicy: original.timePolicy,
      workCalendar: original.workCalendar,
    });
  }
});
