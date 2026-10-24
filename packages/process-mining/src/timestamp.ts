const ISO_PATTERN =
  /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;
const SLASH_PATTERN =
  /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i;

const offsetMinutes = (zone: string | undefined): number => {
  if (!zone || zone.toUpperCase() === 'Z') return 0;
  const match = zone.match(/^([+-])(\d{2}):?(\d{2})?$/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? '0'));
};

const isValidDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) =>
  month >= 1 &&
  month <= 12 &&
  day >= 1 &&
  day <= 31 &&
  hour <= 24 &&
  minute < 60 &&
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
    if (
      !isValidDate(Number(year), Number(month), Number(day), Number(hour), Number(minute))
    )
      return null;
    const milliseconds = Math.round(Number(`0.${fraction}`) * 1000);
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
      offsetMinutes(zone) * 60_000
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
    if (meridiem?.toLowerCase() === 'pm' && hour < 12) hour += 12;
    if (meridiem?.toLowerCase() === 'am' && hour === 12) hour = 0;
    if (!isValidDate(Number(year), month, day, hour, Number(minute))) return null;
    return Date.UTC(
      Number(year),
      month - 1,
      day,
      hour,
      Number(minute),
      Number(secondText),
    );
  }

  const fallback = Date.parse(value);
  return Number.isFinite(fallback) ? fallback : null;
};
