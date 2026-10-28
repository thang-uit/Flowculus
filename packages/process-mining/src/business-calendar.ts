/** Fixed-offset work calendars. Overnight shifts must be split at midnight. */
export interface WorkCalendar {
  utcOffsetMinutes: number;
  weekdays: number[]; // ISO Monday=1 ... Sunday=7
  shifts: Array<{ startMinute: number; endMinute: number }>;
  holidays: string[]; // local YYYY-MM-DD
}
export type TimePolicy =
  { basis: 'elapsed' } | { basis: 'working'; calendar: WorkCalendar };
export const DEFAULT_WORK_CALENDAR: WorkCalendar = {
  utcOffsetMinutes: 420,
  weekdays: [1, 2, 3, 4, 5],
  shifts: [
    { startMinute: 480, endMinute: 720 },
    { startMinute: 780, endMinute: 1020 },
  ],
  holidays: [],
};
export const ELAPSED_TIME_POLICY: TimePolicy = { basis: 'elapsed' };
const DAY = 86400000;
const MINUTE = 60000;
const isoDay = (day: number) => ((((day + 3) % 7) + 7) % 7) + 1;
export function isTimePolicy(value: unknown): value is TimePolicy {
  if (!value || typeof value !== 'object') return false;
  const policy = value as Partial<TimePolicy>;
  if (policy.basis === 'elapsed') return true;
  if (policy.basis !== 'working' || !policy.calendar) return false;
  const c = policy.calendar;
  return (
    Number.isInteger(c.utcOffsetMinutes) &&
    Math.abs(c.utcOffsetMinutes) <= 840 &&
    Array.isArray(c.weekdays) &&
    c.weekdays.length > 0 &&
    c.weekdays.length <= 7 &&
    new Set(c.weekdays).size === c.weekdays.length &&
    c.weekdays.every((d) => Number.isInteger(d) && d >= 1 && d <= 7) &&
    Array.isArray(c.shifts) &&
    c.shifts.length > 0 &&
    c.shifts.length <= 8 &&
    c.shifts.every(
      (s, i) =>
        s &&
        Number.isInteger(s.startMinute) &&
        Number.isInteger(s.endMinute) &&
        s.startMinute >= 0 &&
        s.endMinute <= 1440 &&
        s.startMinute < s.endMinute &&
        (i === 0 || c.shifts[i - 1].endMinute <= s.startMinute),
    ) &&
    Array.isArray(c.holidays) &&
    c.holidays.length <= 1000 &&
    c.holidays.every(
      (d) =>
        typeof d === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(d) &&
        Number.isFinite(Date.parse(d + 'T00:00:00Z')) &&
        new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d,
    )
  );
}
/** Compile once per mining session; each interval uses constant weekly work and a holiday binary search. */
export function createDurationClock(policy: TimePolicy = ELAPSED_TIME_POLICY) {
  if (!isTimePolicy(policy)) throw new Error('invalid-work-calendar');
  if (policy.basis === 'elapsed')
    return (start: number, end: number) => Math.max(0, end - start);
  const c = policy.calendar;
  const offset = c.utcOffsetMinutes * MINUTE;
  const days = new Set(c.weekdays);
  const shifts = c.shifts.map((s) => ({
    start: s.startMinute * MINUTE,
    end: s.endMinute * MINUTE,
  }));
  const daily = shifts.reduce((sum, s) => sum + s.end - s.start, 0);
  const holidays = [...new Set(c.holidays.map((d) => Date.parse(d + 'T00:00:00Z') / DAY))]
    .filter((d) => days.has(isoDay(d)))
    .sort((a, b) => a - b);
  const lower = (day: number) => {
    let lo = 0,
      hi = holidays.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (holidays[mid] < day) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const recurring = (day: number) => {
    const weeks = Math.floor(day / 7);
    let count = weeks * days.size;
    for (let d = weeks * 7; d < day; d++) if (days.has(isoDay(d))) count++;
    return count;
  };
  const cumulative = (time: number) => {
    const local = time + offset,
      day = Math.floor(local / DAY),
      within = local - day * DAY;
    const full = (recurring(day) - (lower(day) - lower(0))) * daily;
    if (!days.has(isoDay(day)) || holidays[lower(day)] === day) return full;
    return (
      full +
      shifts.reduce((sum, s) => sum + Math.max(0, Math.min(within, s.end) - s.start), 0)
    );
  };
  return (start: number, end: number) => {
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      Math.abs(start) > 8.64e15 ||
      Math.abs(end) > 8.64e15
    )
      throw new Error('invalid-calendar-time');
    return Math.max(0, cumulative(end) - cumulative(start));
  };
}
/** Scheduling helper for synthetic fixtures; not a production capacity planner. */
export function addWorkingMinutes(
  start: number,
  minutes: number,
  calendar = DEFAULT_WORK_CALENDAR,
): number {
  if (
    !isTimePolicy({ basis: 'working', calendar }) ||
    !Number.isFinite(start) ||
    !Number.isFinite(minutes) ||
    minutes < 0 ||
    minutes > 1e6
  )
    throw new Error('invalid-work-calendar');
  let at = start,
    remaining = minutes * MINUTE;
  const offset = calendar.utcOffsetMinutes * MINUTE,
    holidays = new Set(calendar.holidays);
  for (let i = 0; i < 10000; i++) {
    const local = at + offset,
      day = Math.floor(local / DAY),
      date = new Date(day * DAY).toISOString().slice(0, 10);
    if (calendar.weekdays.includes(isoDay(day)) && !holidays.has(date)) {
      for (const shift of calendar.shifts) {
        const begin = day * DAY + shift.startMinute * MINUTE - offset,
          end = day * DAY + shift.endMinute * MINUTE - offset;
        if (at >= end) continue;
        at = Math.max(at, begin);
        if (remaining <= end - at) return at + remaining;
        remaining -= end - at;
        at = end;
      }
    }
    at = (day + 1) * DAY - offset;
  }
  throw new Error('calendar-scheduling-limit');
}
