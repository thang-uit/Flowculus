import {
  buildEventLog,
  buildSocialNetwork,
  checkModelConformance,
  mineAlpha,
  dfgToProcessModel,
  createProcessDiscovery,
  eventLogToCsv,
  generatePresetLog,
  parseEventTable,
  suggestColumnMapping,
  type ColumnMapping,
  type DiscoveryFilter,
  type EventLog,
  type EventLogFormat,
  type EventTable,
  type MiningConversionWarning,
  type MiningPresetId,
  type ProcessDiscovery,
  type SocialNetwork,
  type AlphaMiningResult,
  type ModelConformance,
} from '@flowculus/process-mining';
import type { ProcessModel } from '@flowculus/process-model';

export type MiningRequest =
  | { type: 'load-preset'; presetId: MiningPresetId; filter: DiscoveryFilter }
  | { type: 'inspect-file'; fileName: string; source: string }
  | {
      type: 'apply-mapping';
      mapping: ColumnMapping;
      name: string;
      filter: DiscoveryFilter;
    }
  | { type: 'discover'; filter: DiscoveryFilter }
  | { type: 'to-model'; filter: DiscoveryFilter; name: string }
  | { type: 'check-conformance'; model: ProcessModel }
  | { type: 'export-log' };

export interface MiningDiscoveryResponse {
  type: 'discovery';
  logName: string;
  hasStartTimes: boolean;
  discovery: ProcessDiscovery;
  socialNetwork: SocialNetwork;
  alpha: AlphaMiningResult;
  skippedRows: number;
  invalidTimestamps: number;
  invalidStartTimes: number;
}

export interface MiningTableResponse {
  type: 'table';
  fileName: string;
  format: EventLogFormat;
  headers: string[];
  sampleRows: string[][];
  rowCount: number;
  suggestion: Partial<ColumnMapping>;
}

export interface MiningModelResponse {
  type: 'model';
  model: ProcessModel;
  warnings: MiningConversionWarning[];
}

export interface MiningCsvResponse {
  type: 'csv';
  csv: string;
  logName: string;
}

export interface MiningConformanceResponse {
  type: 'conformance';
  result: ModelConformance;
}

export type MiningResponse =
  | MiningDiscoveryResponse
  | MiningTableResponse
  | MiningModelResponse
  | MiningCsvResponse
  | MiningConformanceResponse;

/**
 * Stateful process-mining session shared by the Web Worker and the
 * synchronous fallback. It keeps the uploaded table and the current log so
 * slider changes only send the filter, never the whole log.
 */
export const createMiningSession = () => {
  let table: EventTable | null = null;
  let log: EventLog | null = null;
  let buildSummary = { skippedRows: 0, invalidTimestamps: 0, invalidStartTimes: 0 };
  let socialNetwork: SocialNetwork | null = null;
  let alpha: AlphaMiningResult | null = null;
  let discover: ReturnType<typeof createProcessDiscovery> | null = null;

  const requireLog = (): EventLog => {
    if (!log) throw new Error('No event log is loaded.');
    return log;
  };

  const discovery = (filter: DiscoveryFilter): MiningDiscoveryResponse => {
    const current = requireLog();
    return {
      type: 'discovery',
      logName: current.name,
      hasStartTimes: current.hasStartTimes,
      discovery: (discover ??= createProcessDiscovery(current))(filter),
      socialNetwork: socialNetwork ?? (socialNetwork = buildSocialNetwork(current)),
      alpha: alpha ?? (alpha = mineAlpha(current)),
      ...buildSummary,
    };
  };

  return (request: MiningRequest): MiningResponse => {
    switch (request.type) {
      case 'load-preset':
        table = null;
        log = generatePresetLog(request.presetId);
        socialNetwork = null;
        alpha = null;
        discover = null;
        buildSummary = { skippedRows: 0, invalidTimestamps: 0, invalidStartTimes: 0 };
        return discovery(request.filter);
      case 'inspect-file':
        table = parseEventTable(request.fileName, request.source);
        return {
          type: 'table',
          fileName: request.fileName,
          format: table.format,
          headers: table.headers,
          sampleRows: table.rows.slice(0, 6),
          rowCount: table.rows.length,
          suggestion: suggestColumnMapping(table.headers),
        };
      case 'apply-mapping': {
        if (!table) throw new Error('No event log file is waiting for a column mapping.');
        const result = buildEventLog(table, request.mapping, request.name);
        if (result.log.events.length === 0) {
          throw new Error('No event could be read with this column mapping.');
        }
        log = result.log;
        table = null;
        socialNetwork = null;
        alpha = null;
        discover = null;
        buildSummary = {
          skippedRows: result.skippedRows,
          invalidTimestamps: result.invalidTimestamps,
          invalidStartTimes: result.invalidStartTimes,
        };
        return discovery(request.filter);
      }
      case 'discover':
        return discovery(request.filter);
      case 'to-model': {
        const current = requireLog();
        const { dfg } = (discover ??= createProcessDiscovery(current))(request.filter);
        const converted = dfgToProcessModel(dfg, {
          name: request.name,
          hasStartTimes: current.hasStartTimes,
        });
        return { type: 'model', model: converted.model, warnings: converted.warnings };
      }
      case 'export-log': {
        const current = requireLog();
        return { type: 'csv', csv: eventLogToCsv(current), logName: current.name };
      }
      case 'check-conformance':
        return {
          type: 'conformance',
          result: checkModelConformance(requireLog(), request.model),
        };
    }
  };
};
