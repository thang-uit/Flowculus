import type { AnalysisOptions, AnalysisReport } from '@flowculus/analysis-engine';
import type { ProcessModel } from '@flowculus/process-model';

/** Scenario inputs saved with a Flowculus file (same shape as the engine). */
export type FlowculusAnalysisOptions = AnalysisOptions;

/**
 * Read-only analysis snapshot embedded in `.flowculus.json` for reviewers.
 * It is never trusted on import: the engine recalculates from the model.
 * `cycleTimeEfficiency` is a ratio in [0, 1]; `issues` are locale-neutral.
 */
export type FlowculusAnalysisSnapshot = Pick<
  AnalysisReport,
  | 'status'
  | 'quality'
  | 'metricQuality'
  | 'cycleTimeMinutes'
  | 'theoreticalCycleTimeMinutes'
  | 'cycleTimeEfficiency'
  | 'costPerExecution'
  | 'issues'
  | 'activityTimes'
  | 'littleLaw'
  | 'littleLawForecast'
  | 'queue'
  | 'criticalPath'
  | 'criticalChain'
  | 'pathCount'
> & { units: { time: 'minutes'; cycleTimeEfficiency: 'ratio' } };

export const createAnalysisSnapshot = (
  report: AnalysisReport,
): FlowculusAnalysisSnapshot => ({
  status: report.status,
  quality: report.quality,
  metricQuality: report.metricQuality,
  cycleTimeMinutes: report.cycleTimeMinutes,
  theoreticalCycleTimeMinutes: report.theoreticalCycleTimeMinutes,
  cycleTimeEfficiency: report.cycleTimeEfficiency,
  costPerExecution: report.costPerExecution,
  issues: report.issues,
  activityTimes: report.activityTimes,
  littleLaw: report.littleLaw,
  littleLawForecast: report.littleLawForecast,
  queue: report.queue,
  criticalPath: report.criticalPath,
  criticalChain: report.criticalChain,
  pathCount: report.pathCount,
  units: { time: 'minutes', cycleTimeEfficiency: 'ratio' },
});

export interface FlowculusFile {
  schemaVersion: 1 | 2;
  model: ProcessModel;
  drawioXml?: string;
  /** Active page in preserved multi-page draw.io source (legacy files default to 0). */
  drawioPageIndex?: number;
  analysisOptions?: FlowculusAnalysisOptions;
  analysis?: FlowculusAnalysisSnapshot;
}

const MAX_FLOWCULUS_XML_LENGTH = 50_000_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

export const serializeFlowculusFile = (file: FlowculusFile): string =>
  JSON.stringify({ ...file, schemaVersion: file.model.schemaVersion }, null, 2);

export const parseFlowculusFile = (source: string): FlowculusFile => {
  const parsed: unknown = JSON.parse(source);
  if (!isRecord(parsed)) {
    throw new Error('The file does not contain a Flowculus object.');
  }
  if (
    (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) ||
    !isRecord(parsed.model)
  ) {
    throw new Error('Unsupported Flowculus file schema.');
  }
  const model = parsed.model;
  if (
    typeof model.id !== 'string' ||
    typeof model.name !== 'string' ||
    (model.schemaVersion !== 1 && model.schemaVersion !== 2) ||
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
  if (
    parsed.drawioPageIndex != null &&
    (!Number.isInteger(parsed.drawioPageIndex) || (parsed.drawioPageIndex as number) < 0)
  )
    throw new Error('Invalid draw.io page index.');
  return parsed as unknown as FlowculusFile;
};
