import {
  DEFAULT_WORK_CALENDAR,
  isTimePolicy,
  type WorkCalendar,
} from '@flowculus/process-mining';
export interface WorkCalendarDraft {
  offset: string;
  days: string;
  shifts: string;
  holidays: string;
}
export type CalendarField = keyof WorkCalendarDraft;
export function parseWorkCalendarDraft(
  draft: WorkCalendarDraft,
): { ok: true; calendar: WorkCalendar } | { ok: false; field: CalendarField } {
  const offset = draft.offset.trim() ? Number(draft.offset) : NaN;
  const days = draft.days.split(',').map((s) => (s.trim() ? Number(s) : NaN));
  const toMinute = (value: string) => {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    return match && Number(match[2]) < 60
      ? Number(match[1]) * 60 + Number(match[2])
      : NaN;
  };
  const shifts = draft.shifts
    .split(',')
    .map((value) => {
      const [start, end, ...extra] = value.trim().split('-');
      return {
        startMinute: extra.length ? NaN : toMinute(start ?? ''),
        endMinute: toMinute(end ?? ''),
      };
    })
    .sort((a, b) => a.startMinute - b.startMinute);
  const holidays = draft.holidays
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const fields: Array<[CalendarField, Partial<WorkCalendar>]> = [
    ['offset', { utcOffsetMinutes: offset }],
    ['days', { weekdays: days }],
    ['shifts', { shifts }],
    ['holidays', { holidays }],
  ];
  for (const [field, value] of fields)
    if (
      !isTimePolicy({
        basis: 'working',
        calendar: { ...DEFAULT_WORK_CALENDAR, ...value },
      })
    )
      return { ok: false, field };
  return {
    ok: true,
    calendar: { utcOffsetMinutes: offset, weekdays: days, shifts, holidays },
  };
}
