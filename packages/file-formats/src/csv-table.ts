export type CsvDelimiter = ',' | ';' | '\t' | '|';

export interface CsvTable {
  delimiter: CsvDelimiter;
  rows: string[][];
}

const CANDIDATE_DELIMITERS: CsvDelimiter[] = [',', ';', '\t', '|'];

/**
 * Guesses the delimiter from the first non-empty line, ignoring quoted text.
 * ERP/CRM exports from European locales commonly use `;`.
 */
export const detectCsvDelimiter = (source: string): CsvDelimiter => {
  const firstLine =
    source
      .replace(/^﻿/, '')
      .split(/\r?\n/)
      .find((line) => line.trim().length > 0 && !line.trim().startsWith('#')) ?? '';
  const unquoted = firstLine.replace(/"(?:[^"]|"")*"/g, '');
  let best: CsvDelimiter = ',';
  let bestCount = 0;
  for (const delimiter of CANDIDATE_DELIMITERS) {
    const count = unquoted.split(delimiter).length - 1;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
};

/** RFC 4180-style CSV reader without a parser dependency. Empty rows are skipped. */
export const parseCsvTable = (source: string, delimiter?: CsvDelimiter): CsvTable => {
  const separator = delimiter ?? detectCsvDelimiter(source);
  const rows: string[][] = [];
  const row: string[] = [];
  let field = '';
  let quoted = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    if (row.some((value) => value.trim() !== '')) rows.push([...row]);
    row.length = 0;
  };

  const input = source.replace(/^﻿/, '');
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === separator && !quoted) {
      pushField();
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      pushRow();
    } else {
      field += character;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  return { delimiter: separator, rows };
};

export const escapeCsvValue = (value: unknown, delimiter: CsvDelimiter = ','): string => {
  const text = value == null ? '' : String(value);
  return text.includes(delimiter) || /["\n\r]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
};
