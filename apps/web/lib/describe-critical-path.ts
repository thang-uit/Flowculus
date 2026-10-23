import type { AnalysisReport } from '@flowculus/analysis-engine';

import type { WorkspaceCopy } from '@/lib/i18n';

/**
 * Text for reports: the book's CPM result when it is defined, otherwise the
 * dominant expected-time chain, labelled as an assumption.
 */
export const describeCriticalPath = (
  report: AnalysisReport,
  copy: WorkspaceCopy,
): string | null => {
  if (
    report.criticalPath?.status === 'ready' &&
    report.criticalPath.taskLabels.length > 0
  ) {
    return `${report.criticalPath.taskLabels.join(' → ')}\nCPM (TCT): ${report.criticalPath.formula} ${copy.minutes}`;
  }
  const chain = report.criticalChain;
  if (chain?.status === 'ready' && chain.taskLabels.length > 0) {
    const label =
      chain.quality === 'exact' ? copy.criticalChainExact : copy.criticalChainDominant;
    return `${chain.taskLabels.join(' → ')}\n${label}: ${chain.formula} ${copy.minutes}`;
  }
  return report.criticalPath?.reason === 'missing-processing-time'
    ? copy.criticalPathNeedsProcessing
    : null;
};
