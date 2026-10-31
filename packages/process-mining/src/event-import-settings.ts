export interface EventImportSettings {
  mode: 'events' | 'jira-status' | 'snapshot';
  dateOrder: 'auto' | 'day-first' | 'month-first';
  /** Applied only to timestamps without an explicit UTC offset. */
  utcOffsetMinutes: number;
  /** One-based nonempty, non-comment record in CSV or the first XLSX sheet. */
  headerRow: number;
}

export const DEFAULT_EVENT_IMPORT_SETTINGS: EventImportSettings = {
  mode: 'events',
  dateOrder: 'auto',
  utcOffsetMinutes: 0,
  headerRow: 1,
};

export function isEventImportSettings(value: unknown): value is EventImportSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Record<string, unknown>;
  return (
    (settings.mode === 'events' ||
      settings.mode === 'jira-status' ||
      settings.mode === 'snapshot') &&
    (settings.dateOrder === 'auto' ||
      settings.dateOrder === 'day-first' ||
      settings.dateOrder === 'month-first') &&
    typeof settings.utcOffsetMinutes === 'number' &&
    Number.isInteger(settings.utcOffsetMinutes) &&
    Math.abs(settings.utcOffsetMinutes) <= 840 &&
    typeof settings.headerRow === 'number' &&
    Number.isInteger(settings.headerRow) &&
    settings.headerRow >= 1 &&
    settings.headerRow <= 50
  );
}

export const normalizeImportHeader = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
