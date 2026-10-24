import type { AnalysisReport } from '@flowculus/analysis-engine';

import type { WorkspaceCopy } from '@/lib/i18n';

const qualitySuffix = (quality: string, copy: WorkspaceCopy): string =>
  quality === 'exact' ? '' : ` (${copy.quality.assumptionTag})`;

/**
 * Report text for the two results Flowculus keeps apart: the book's CPM over
 * processing time and the cycle-time critical chain. Each line names which
 * one it is and whether it is exact, so a heuristic is never shown as CPM.
 */
export const describeCriticalPath = (
  report: AnalysisReport,
  copy: WorkspaceCopy,
): string | null => {
  const lines: string[] = [];
  const cpm = report.criticalPath;
  if (cpm?.status === 'ready' && cpm.taskLabels.length > 0) {
    lines.push(
      `${copy.quality.criticalPathTitle}${qualitySuffix(cpm.quality, copy)}: ${cpm.taskLabels.join(' → ')}`,
      `  TCT = ${cpm.formula} ${copy.minutes}`,
    );
  } else if (cpm?.reason) {
    lines.push(
      `${copy.quality.criticalPathTitle}: ${copy.quality.cpmReasons[cpm.reason]}`,
    );
  }
  const chain = report.criticalChain;
  if (chain?.status === 'ready' && chain.taskLabels.length > 0) {
    const label =
      chain.quality === 'exact'
        ? copy.quality.criticalChainExact
        : copy.quality.criticalChainHeuristic;
    lines.push(
      `${label}: ${chain.taskLabels.join(' → ')}`,
      `  CT = ${chain.formula} ${copy.minutes}`,
    );
  } else if (chain?.reason) {
    lines.push(
      `${copy.quality.criticalChainTitle}: ${copy.quality.chainReasons[chain.reason]}`,
    );
  }
  return lines.length > 0 ? lines.join('\n') : null;
};
