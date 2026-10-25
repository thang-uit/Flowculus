import type { AnalysisReport } from '@flowculus/analysis-engine';
import { isActivityKind, type ProcessModel } from '@flowculus/process-model';

import { describeCriticalPath } from '@/lib/describe-critical-path';
import { formatDiagnostic, groupDiagnostics } from '@/lib/diagnostic-messages';
import { formatCost, formatPercent } from '@/lib/format';
import type { Locale, WorkspaceCopy } from '@/lib/i18n';
import { qualityLabel } from '@/lib/quality-label';

export interface ReportMetric {
  label: string;
  value: string;
  /** Localised quality of this metric (exact / assumption / simulation). */
  quality: string;
}

export interface ReportActivityRow {
  label: string;
  cycleTime: string;
  source: string;
  processing: string;
  waiting: string;
}

export interface ReportContent {
  quality: string;
  metrics: ReportMetric[];
  formulaLines: string[];
  activities: ReportActivityRow[];
  errors: string[];
  warnings: string[];
  info: string[];
}

const number = (value: number | null | undefined, suffix: string, empty: string) =>
  value == null || !Number.isFinite(value)
    ? empty
    : `${Number(value.toFixed(2))}${suffix}`;

/**
 * Locale-aware content shared by the PDF and the raster report, so both show
 * the same metric qualities, findings and per-activity time sources as the UI.
 * Pure: no DOM access, so it is unit-tested.
 */
export const buildReportContent = ({
  report,
  model,
  copy,
  locale,
  currency,
}: {
  report: AnalysisReport;
  model: ProcessModel;
  copy: WorkspaceCopy;
  locale: Locale;
  currency?: string;
}): ReportContent => {
  const empty = copy.emptyValue;
  const noAnalysis = report.status === 'empty';
  const minutes = ` ${copy.minutes}`;
  const metrics: ReportMetric[] = [
    {
      label: copy.cycleTime,
      value: number(report.cycleTimeMinutes, minutes, empty),
      quality: noAnalysis
        ? copy.emptyAnalysis
        : qualityLabel(report.metricQuality.cycleTime, copy),
    },
    {
      label: copy.theoreticalTime,
      value: number(report.theoreticalCycleTimeMinutes, minutes, empty),
      quality: noAnalysis
        ? copy.emptyAnalysis
        : qualityLabel(report.metricQuality.theoreticalCycleTime, copy),
    },
    {
      label: copy.cte,
      value: formatPercent(report.cycleTimeEfficiency) ?? empty,
      quality: noAnalysis
        ? copy.emptyAnalysis
        : qualityLabel(report.metricQuality.cycleTimeEfficiency, copy),
    },
    {
      label: copy.cost,
      value: formatCost(report.costPerExecution, currency, locale) ?? empty,
      quality: noAnalysis
        ? copy.emptyAnalysis
        : qualityLabel(report.metricQuality.cost, copy),
    },
  ];

  const formulaLines = [
    report.formula
      ? `${copy.cycleFormulaLabel} = ${report.formula}`
      : `${copy.cycleFormulaLabel}: ${noAnalysis ? copy.emptyAnalysis : copy.quality.simulationNoNumber}`,
    report.theoreticalFormula
      ? `${copy.theoreticalFormulaLabel} = ${report.theoreticalFormula}`
      : '',
    report.costFormula ? `${copy.costFormulaLabel} = ${report.costFormula}` : '',
  ].filter(Boolean);
  if (report.littleLaw) {
    formulaLines.push(
      `${copy.scenarioFormula}: ${number(report.littleLaw.workInProcess, '', empty)} = ${number(report.littleLaw.arrivalRatePerHour, '', empty)}/h × ${number(report.littleLaw.cycleTimeHours, ' h', empty)}`,
    );
  }
  if (report.queue) {
    formulaLines.push(
      `${copy.queueModel} ${report.queue.model}: ${report.queue.formula}`,
      `${copy.queueUtilization}: ${formatPercent(report.queue.utilization) ?? empty}`,
      `${copy.averageQueue}: ${number(report.queue.averageQueueLength, '', empty)}`,
      `${copy.averageWait}: ${number(report.queue.averageWaitingHours, ' h', empty)}`,
      `${copy.averageSystem}: ${number(report.queue.averageSystemHours, ' h', empty)}`,
    );
  }
  const pathText = describeCriticalPath(report, copy);
  if (pathText) formulaLines.push(...pathText.split('\n'));

  const activities: ReportActivityRow[] = Object.values(model.nodes)
    .filter((node) => isActivityKind(node.kind) && report.activityTimes[node.id])
    .map((node) => {
      const time = report.activityTimes[node.id]!;
      return {
        label: node.label || node.id,
        cycleTime: number(time.cycleTimeMinutes, '', empty),
        source: copy.quality.cycleTimeSource[time.cycleTimeSource],
        processing: `${number(time.processingMinutes, '', empty)} (${copy.quality.processingSource[time.processingSource]})`,
        waiting: number(time.waitingMinutes, '', empty),
      };
    });

  const groups = groupDiagnostics(report.issues);
  const format = (issues: typeof report.issues) =>
    issues.map((issue) => formatDiagnostic(issue, locale));

  return {
    quality: noAnalysis ? copy.emptyAnalysis : qualityLabel(report.quality, copy),
    metrics,
    formulaLines,
    activities,
    errors: format(groups.error),
    warnings: format(groups.warning),
    info: format(groups.info),
  };
};
