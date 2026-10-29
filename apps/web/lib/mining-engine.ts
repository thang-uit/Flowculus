import {
  buildEventLog,
  isTimePolicy,
  ELAPSED_TIME_POLICY,
  type TimePolicy,
  compareTaskStandards,
  type TaskStandard,
  type StandardPerformance,
  buildFootprint,
  alphaToPetri,
  bpmnToPetri,
  verifyPetri,
  alignmentConformance,
  type Footprint,
  type PetriConversion,
  type PetriVerification,
  type ConformanceOptions,
  type AlignmentConformance,
  buildSocialNetwork,
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
} from '@flowculus/process-mining';
import type { ProcessModel } from '@flowculus/process-model';
import { isValidDocumentName, normalizeDocumentName } from './documents/document-types';
import {
  createMiningLogReader,
  type MiningLogPage,
  type MiningLogQuery,
} from './mining-log-page';

export type MiningRequest =
  | {
      type: 'load-preset';
      presetId: MiningPresetId;
      filter: DiscoveryFilter;
      timePolicy?: TimePolicy;
    }
  | { type: 'inspect-file'; fileName: string; source: string }
  | {
      type: 'apply-mapping';
      mapping: ColumnMapping;
      name: string;
      filter: DiscoveryFilter;
      timePolicy?: TimePolicy;
    }
  | { type: 'discover'; filter: DiscoveryFilter; timePolicy?: TimePolicy }
  | { type: 'to-model'; filter: DiscoveryFilter; name: string }
  | { type: 'check-conformance'; model: ProcessModel; options?: ConformanceOptions }
  | { type: 'compare-standards'; standards: TaskStandard[]; timePolicy?: TimePolicy }
  | { type: 'export-log' }
  | ({ type: 'read-log-page' } & MiningLogQuery);

export interface MiningDiscoveryResponse {
  type: 'discovery';
  logName: string;
  hasStartTimes: boolean;
  /** Includes blank, invalid and late start timestamps in accepted events. */
  missingStartTimes: number;
  /** Full-log labels; graph display filters must not hide mapping choices. */
  activityNames: string[];
  discovery: ProcessDiscovery;
  socialNetwork: SocialNetwork;
  alpha: AlphaMiningResult;
  footprint: Footprint | null;
  petri: PetriConversion;
  verification: PetriVerification | null;
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
  alignment: AlignmentConformance;
  referencePetri: PetriConversion;
  verification: PetriVerification | null;
}

export type MiningResponse =
  | MiningDiscoveryResponse
  | MiningTableResponse
  | MiningModelResponse
  | MiningCsvResponse
  | MiningLogPage
  | MiningConformanceResponse
  | {
      type: 'standards';
      rows: StandardPerformance[];
      measuredEvents: number;
      comparedEvents: number;
      totalEvents: number;
    };

/**
 * Stateful process-mining session shared by the Web Worker and the
 * synchronous fallback. It keeps the uploaded table and the current log so
 * slider changes only send the filter, never the whole log.
 */
export const createMiningSession = () => {
  let table: EventTable | null = null;
  let logVersion = 0;
  let logReader: ((query: MiningLogQuery) => MiningLogPage) | null = null;
  let timePolicy: TimePolicy = ELAPSED_TIME_POLICY;
  let log: EventLog | null = null;
  let buildSummary = { skippedRows: 0, invalidTimestamps: 0, invalidStartTimes: 0 };
  let socialNetwork: SocialNetwork | null = null;
  let alpha: AlphaMiningResult | null = null;
  let evidence: Pick<
    MiningDiscoveryResponse,
    'footprint' | 'petri' | 'verification'
  > | null = null;
  let discover: ReturnType<typeof createProcessDiscovery> | null = null;
  let activityNames: string[] | null = null;
  let missingStartTimes: number | null = null;

  const requireLog = (): EventLog => {
    if (!log) throw new Error('No event log is loaded.');
    return log;
  };

  const discovery = (filter: DiscoveryFilter): MiningDiscoveryResponse => {
    const current = requireLog();
    alpha ??= mineAlpha(current);
    if (!evidence) {
      const petri = alphaToPetri(alpha, current.name);
      evidence = {
        footprint: buildFootprint(current),
        petri,
        verification: petri.status === 'ready' ? verifyPetri(petri.net) : null,
      };
    }
    return {
      ...evidence,
      type: 'discovery',
      logName: current.name,
      hasStartTimes: current.hasStartTimes,
      missingStartTimes: (missingStartTimes ??= current.events.reduce(
        (count, event) => count + (event.startTime == null ? 1 : 0),
        0,
      )),
      activityNames: (activityNames ??= [
        ...new Set(current.events.map((event) => event.activity)),
      ].sort()),
      discovery: (discover ??= createProcessDiscovery(current, timePolicy))(filter),
      socialNetwork: socialNetwork ?? (socialNetwork = buildSocialNetwork(current)),
      alpha: alpha ?? (alpha = mineAlpha(current)),
      ...buildSummary,
    };
  };

  return (request: MiningRequest): MiningResponse => {
    switch (request.type) {
      case 'load-preset':
        timePolicy = request.timePolicy ?? timePolicy;
        if (!isTimePolicy(timePolicy)) throw new Error('invalid-work-calendar');
        table = null;
        log = generatePresetLog(request.presetId);
        logVersion += 1;
        logReader = createMiningLogReader(log, logVersion);
        socialNetwork = null;
        alpha = null;
        evidence = null;
        discover = null;
        activityNames = null;
        missingStartTimes = null;
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
        timePolicy = request.timePolicy ?? timePolicy;
        if (!isTimePolicy(timePolicy)) throw new Error('invalid-work-calendar');
        if (!table) throw new Error('No event log file is waiting for a column mapping.');
        const result = buildEventLog(table, request.mapping, request.name);
        if (result.log.events.length === 0) {
          throw new Error('No event could be read with this column mapping.');
        }
        log = result.log;
        table = null;
        logVersion += 1;
        logReader = createMiningLogReader(log, logVersion);
        socialNetwork = null;
        alpha = null;
        evidence = null;
        discover = null;
        activityNames = null;
        missingStartTimes = null;
        buildSummary = {
          skippedRows: result.skippedRows,
          invalidTimestamps: result.invalidTimestamps,
          invalidStartTimes: result.invalidStartTimes,
        };
        return discovery(request.filter);
      }
      case 'discover':
        if (request.timePolicy) {
          if (!isTimePolicy(request.timePolicy)) throw new Error('invalid-work-calendar');
          if (JSON.stringify(timePolicy) !== JSON.stringify(request.timePolicy)) {
            timePolicy = structuredClone(request.timePolicy);
            discover = null;
          }
        }
        return discovery(request.filter);
      case 'to-model': {
        const name = normalizeDocumentName(request.name);
        if (!isValidDocumentName(name)) throw new Error('invalid-process-name');
        const current = requireLog();
        const { dfg } = (discover ??= createProcessDiscovery(current, timePolicy))(
          request.filter,
        );
        const converted = dfgToProcessModel(dfg, {
          name,
          hasStartTimes: current.hasStartTimes,
        });
        return { type: 'model', model: converted.model, warnings: converted.warnings };
      }
      case 'compare-standards': {
        const current = requireLog();
        const rows = compareTaskStandards(
          current,
          request.standards,
          request.timePolicy ?? timePolicy,
        );
        return {
          type: 'standards',
          rows,
          comparedEvents: rows.reduce((sum, row) => sum + row.count, 0),
          measuredEvents: current.events.filter((event) => event.startTime != null)
            .length,
          totalEvents: current.events.length,
        };
      }
      case 'export-log': {
        const current = requireLog();
        return { type: 'csv', csv: eventLogToCsv(current), logName: current.name };
      }
      case 'read-log-page': {
        if (!logReader) throw new Error('No event log is loaded.');
        return logReader(request);
      }
      case 'check-conformance': {
        const referencePetri = bpmnToPetri(request.model, request.options?.poolId);
        const alignment = alignmentConformance(
          requireLog(),
          request.model,
          request.options,
        );
        return {
          referencePetri,
          alignment,
          verification:
            referencePetri.status === 'ready' ? verifyPetri(referencePetri.net) : null,
          type: 'conformance',
        };
      }
    }
  };
};
