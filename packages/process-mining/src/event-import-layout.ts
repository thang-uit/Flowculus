import { parseCsvTable, detectCsvDelimiter } from '@flowculus/file-formats';
import {
  detectEventLogFormat,
  parseEventTable,
  suggestColumnMapping,
  validateEventTable,
} from './parse';
import {
  DEFAULT_EVENT_IMPORT_SETTINGS,
  isEventImportSettings,
  normalizeImportHeader,
  type EventImportSettings,
} from './event-import-settings';
import type { ColumnMapping, EventTable } from './types';

export interface EventImportLayout {
  headerOptions: { row: number; label: string }[];
  settings: EventImportSettings;
  kind: EventImportSettings['mode'];
}

function columns(headers: string[]) {
  const keys = headers.map(normalizeImportHeader);
  return (...candidates: string[]) =>
    headers[keys.findIndex((key) => candidates.includes(key))];
}

function suggest(headers: string[]): Partial<ColumnMapping> {
  const find = columns(headers);
  const suggestion = suggestColumnMapping(headers);
  suggestion.caseId ??= find('issuekey', 'parentkey');
  if (find('tostatus') && find('changetime', 'changedat', 'changed')) {
    suggestion.activity = find('tostatus');
    suggestion.timestamp = find('changetime', 'changedat', 'changed');
    delete suggestion.startTimestamp;
    delete suggestion.lifecycle;
    delete suggestion.resource;
    delete suggestion.cost;
  }
  return suggestion;
}

/** XLSX arrives as CSV extracted from its first worksheet by the browser worker. */
export function inspectEventImport(
  fileName: string,
  source: string,
  requested?: EventImportSettings,
): {
  table: EventTable;
  layout: EventImportLayout;
  suggestion: Partial<ColumnMapping>;
} {
  if (requested && !isEventImportSettings(requested))
    throw new Error('import-invalid-settings');
  const format = detectEventLogFormat(fileName, source);
  let table: EventTable;
  const settings = { ...(requested ?? DEFAULT_EVENT_IMPORT_SETTINGS) };
  let headerOptions: EventImportLayout['headerOptions'] = [];
  if (format === 'csv' || format === 'xlsx') {
    // A title above a semicolon/tab-separated table must not decide its delimiter.
    const lines = source
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trimStart().startsWith('#'));
    const delimiterSource = lines.slice(0, 50).find((line) => /[,;\t|]/.test(line)) ?? '';
    const delimiter = detectCsvDelimiter(delimiterSource);
    const rows = parseCsvTable(source, delimiter).rows.filter(
      (row) => !row[0]?.trim().startsWith('#'),
    );
    headerOptions = rows.slice(0, Math.min(50, rows.length - 1)).map((row, index) => ({
      row: index + 1,
      label: row.slice(0, 4).join(' · ').slice(0, 140),
    }));
    if (!requested) {
      let best = -1;
      headerOptions.forEach(({ row }) => {
        const headers = rows[row - 1].map((value) => value.trim());
        if (
          headers.length < 3 ||
          headers.some((value) => !value) ||
          new Set(headers).size !== headers.length
        )
          return;
        const score = Object.keys(suggest(headers)).length;
        if (score > best) {
          best = score;
          settings.headerRow = row;
        }
      });
    }
    const headers = rows[settings.headerRow - 1];
    if (!headers) throw new Error('import-invalid-header');
    table = validateEventTable({ format, headers, rows: rows.slice(settings.headerRow) });
  } else {
    table = parseEventTable(fileName, source);
    settings.headerRow = 1;
  }
  const find = columns(table.headers);
  const jira = !!find('tostatus') && !!find('changetime', 'changedat', 'changed');
  const snapshot =
    !jira &&
    !!find('issuekey') &&
    !!find('status') &&
    !find('timestamp', 'completedat', 'completetime', 'endtime');
  const kind = jira ? 'jira-status' : snapshot ? 'snapshot' : 'events';
  if (!requested) settings.mode = kind;
  return {
    table,
    suggestion: suggest(table.headers),
    layout: { headerOptions, settings, kind },
  };
}
