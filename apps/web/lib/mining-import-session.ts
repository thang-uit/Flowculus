import {
  buildEventLog,
  inspectEventImport,
  prepareEventImport,
  type ColumnMapping,
  type EventImportSettings,
} from '@flowculus/process-mining';

/** Worker-local pending input and reviewed normalization, separate from the active log. */
export function createMiningImportSession() {
  let inspected: ReturnType<typeof inspectEventImport> | null = null;
  let prepared: { key: string; value: ReturnType<typeof prepareEventImport> } | null =
    null;
  const clear = () => {
    inspected = null;
    prepared = null;
  };
  const requireTable = (settings?: EventImportSettings) => {
    if (!inspected) throw new Error('No event log file is waiting for a column mapping.');
    if (settings && settings.headerRow !== inspected.layout.settings.headerRow)
      throw new Error('import-invalid-header');
    return inspected.table;
  };
  return {
    clear,
    inspect(fileName: string, source: string, settings?: EventImportSettings) {
      inspected = inspectEventImport(fileName, source, settings);
      prepared = null;
      const { table, suggestion, layout } = inspected;
      return {
        type: 'table' as const,
        fileName,
        format: table.format,
        headers: table.headers,
        sampleRows: table.rows.slice(0, 6),
        rowCount: table.rows.length,
        suggestion,
        layout,
      };
    },
    review(mapping: ColumnMapping, settings: EventImportSettings) {
      prepared = {
        key: JSON.stringify([mapping, settings]),
        value: prepareEventImport(requireTable(settings), mapping, settings, ''),
      };
      return { type: 'import-review' as const, review: prepared.value.review };
    },
    apply(mapping: ColumnMapping, name: string, settings?: EventImportSettings) {
      const table = requireTable(settings);
      if (!settings) {
        // Old drafts retain the parser and date interpretation used when saved.
        return { result: buildEventLog(table, mapping, name), review: undefined };
      }
      const key = JSON.stringify([mapping, settings]);
      const value =
        prepared?.key === key
          ? prepared.value
          : prepareEventImport(table, mapping, settings, name);
      if (value.review.ambiguousDates) throw new Error('import-ambiguous-dates');
      return {
        result: { ...value.result, log: { ...value.result.log, name } },
        review: value.review,
      };
    },
  };
}
