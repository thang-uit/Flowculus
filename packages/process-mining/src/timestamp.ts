const ISO_PATTERN =
  /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;
const SLASH_PATTERN =
  /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i;

const offsetMinutes = (zone: string | undefined): number | null => {
  if (!zone || zone.toUpperCase() === 'Z') return 0;
  const match = zone.match(/^([+-])(\d{2}):?(\d{2})?$/);
  if (!match || Number(match[2]) > 23 || Number(match[3] ?? '0') > 59) return null;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? '0'));
};

const isValidDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
) =>
  month >= 1 &&
  month <= 12 &&
  day >= 1 &&
  day <= new Date(Date.UTC(year, month, 0)).getUTCDate() &&
  hour >= 0 &&
  hour < 24 &&
  minute >= 0 &&
  minute < 60 &&
  second >= 0 &&
  second < 60 &&
  year > 1900;

/**
 * Decides whether `03/04/2026` means 3 April (day-first) from the values in a
 * column: any first component above 12 proves day-first, any second component
 * above 12 proves month-first. Ambiguous columns default to day-first, the
 * convention used in Vietnam and most ERP exports outside the US.
 */
export const detectDayFirst = (values: string[]): boolean => {
  for (const value of values) {
    const match = value.trim().match(SLASH_PATTERN);
    if (!match) continue;
    if (Number(match[1]) > 12) return true;
    if (Number(match[2]) > 12) return false;
  }
  return true;
};

/**
 * Parses the timestamp formats seen in ERP/CRM/service-desk exports into epoch
 * milliseconds. Timestamps without a zone are read as UTC so the same file
 * always yields the same durations regardless of the viewer's time zone.
 */
export const parseTimestamp = (raw: string, dayFirst = true): number | null => {
  const value = raw.trim();
  if (!value) return null;

  if (/^\d{9,11}(?:\.\d+)?$/.test(value)) return Math.round(Number(value) * 1000);
  if (/^\d{12,14}$/.test(value)) return Number(value);

  const iso = value.match(ISO_PATTERN);
  if (iso) {
    const [
      ,
      year,
      month,
      day,
      hour = '0',
      minute = '0',
      second = '0',
      fraction = '0',
      zone,
    ] = iso;
    const zoneOffset = offsetMinutes(zone);
    const midnight =
      Number(hour) === 24 &&
      Number(minute) === 0 &&
      Number(second) === 0 &&
      Number(fraction) === 0;
    if (
      zoneOffset == null ||
      !isValidDate(
        Number(year),
        Number(month),
        Number(day),
        midnight ? 0 : Number(hour),
        Number(minute),
        Number(second),
      )
    )
      return null;
    const milliseconds = Math.floor(Number(`0.${fraction}`) * 1000);
    return (
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        milliseconds,
      ) -
      zoneOffset * 60_000
    );
  }

  const slash = value.match(SLASH_PATTERN);
  if (slash) {
    const [
      ,
      first,
      second,
      year,
      hourText = '0',
      minute = '0',
      secondText = '0',
      meridiem,
    ] = slash;
    const day = Number(dayFirst ? first : second);
    const month = Number(dayFirst ? second : first);
    let hour = Number(hourText);
    if (meridiem && (hour < 1 || hour > 12)) return null;
    if (meridiem?.toLowerCase() === 'pm' && hour < 12) hour += 12;
    if (meridiem?.toLowerCase() === 'am' && hour === 12) hour = 0;
    if (!isValidDate(Number(year), month, day, hour, Number(minute), Number(secondText)))
      return null;
    return Date.UTC(
      Number(year),
      month - 1,
      day,
      hour,
      Number(minute),
      Number(secondText),
    );
  }

  // Date.parse accepts browser-dependent formats, local zones and rolled-over
  // calendar dates. Reject unknown formats rather than silently changing a log.
  return null;
};
