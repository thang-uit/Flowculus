import type { ProcessModel } from '@flowculus/process-model';

export interface FlowculusAnalysisOptions {
  arrivalRatePerHour?: number;
  workInProcess?: number;
  workingHoursPerDay?: number;
  serviceRatePerHour?: number;
  servers?: number;
  resourceCounts?: Record<string, number>;
}

export interface FlowculusAnalysisSnapshot {
  cycleTimeMinutes: number | null;
  theoreticalCycleTimeMinutes: number | null;
  cycleTimeEfficiency: number | null;
  costPerExecution: number | null;
  littleLaw?: {
    arrivalRatePerHour: number;
    workInProcess: number;
    cycleTimeHours: number;
  };
  queue?: {
    status: 'ready' | 'invalid' | 'unstable';
    model: 'M/M/1' | 'M/M/c';
    utilization: number | null;
    averageQueueLength: number | null;
    averageWaitingHours: number | null;
    averageSystemHours: number | null;
    averageSystemCount: number | null;
    formula: string;
    warnings: string[];
  };
  criticalPath?: {
    status: 'ready' | 'unavailable';
    durationMinutes: number | null;
    taskIds: string[];
    taskLabels: string[];
    formula: string;
    reason?:
      | 'missing-start'
      | 'decision-gateway'
      | 'missing-processing-time'
      | 'rework-or-cycle';
  };
  criticalChain?: {
    status: 'ready' | 'unavailable';
    quality: 'exact' | 'assumption';
    basis: 'deterministic' | 'dominant-branch';
    nodeIds: string[];
    edgeIds: string[];
    taskIds: string[];
    taskLabels: string[];
    durationMinutes: number | null;
    formula: string;
  };
  littleLawForecast?: {
    arrivalRatePerHour: number;
    cycleTimeHours: number;
    workInProcess: number;
  };
  quality?: 'exact' | 'assumption' | 'simulation-required';
  pathCount?: {
    status: 'ready' | 'empty' | 'cyclic' | 'limit';
    count: number | null;
    endNodeIds: string[];
    formula: string;
    warning?: string;
  };
}

export interface FlowculusFile {
  schemaVersion: 1;
  model: ProcessModel;
  drawioXml?: string;
  analysisOptions?: FlowculusAnalysisOptions;
  analysis?: FlowculusAnalysisSnapshot;
}

const MAX_FLOWCULUS_XML_LENGTH = 50_000_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

export const serializeFlowculusFile = (file: FlowculusFile): string =>
  JSON.stringify(file, null, 2);

export const parseFlowculusFile = (source: string): FlowculusFile => {
  const parsed: unknown = JSON.parse(source);
  if (!isRecord(parsed)) {
    throw new Error('The file does not contain a Flowculus object.');
  }
  if (parsed.schemaVersion !== 1 || !isRecord(parsed.model)) {
    throw new Error('Unsupported Flowculus file schema.');
  }
  const model = parsed.model;
  if (
    typeof model.id !== 'string' ||
    typeof model.name !== 'string' ||
    model.schemaVersion !== 1 ||
    !isRecord(model.nodes) ||
    !isRecord(model.edges)
  ) {
    throw new Error('The Flowculus model is malformed.');
  }
  if (
    parsed.drawioXml != null &&
    (typeof parsed.drawioXml !== 'string' ||
      parsed.drawioXml.length > MAX_FLOWCULUS_XML_LENGTH)
  ) {
    throw new Error('The embedded draw.io XML is too large.');
  }
  return parsed as unknown as FlowculusFile;
};
