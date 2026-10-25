import type { WorkspaceExportFormat } from '@/lib/workspace-exports';

/** Only reports need a current analysis result; model files must remain rescuable. */
export const requiresAnalysisReport = (format: WorkspaceExportFormat): boolean =>
  format === 'pdf' || format === 'report-png' || format === 'report-jpeg';
