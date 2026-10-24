import type { PathCountReport } from '@flowculus/analysis-engine';
import type { MiningConversionWarning } from '@flowculus/process-mining';
import type { Diagnostic, DiagnosticSeverity } from '@flowculus/validation';

import type { Locale, WorkspaceCopy } from '@/lib/i18n';
import { DIAGNOSTICS_EN } from '@/lib/i18n/diagnostics-en';
import { DIAGNOSTICS_VI } from '@/lib/i18n/diagnostics-vi';

/**
 * The only place where locale-neutral engine codes become sentences. Every
 * code is typed as a `Record<DiagnosticCode, …>` key, so a new code without
 * an English and a Vietnamese message fails the type check.
 */
export const formatDiagnostic = (diagnostic: Diagnostic, locale: Locale): string =>
  (locale === 'vi' ? DIAGNOSTICS_VI : DIAGNOSTICS_EN)[diagnostic.code](
    diagnostic.params ?? {},
  );

export const groupDiagnostics = (
  issues: Diagnostic[],
): Record<DiagnosticSeverity, Diagnostic[]> => ({
  error: issues.filter((issue) => issue.severity === 'error'),
  warning: issues.filter((issue) => issue.severity === 'warning'),
  info: issues.filter((issue) => issue.severity === 'info'),
});

export const formatPathCountWarning = (
  warning: PathCountReport['warning'],
  copy: WorkspaceCopy,
): string | undefined =>
  warning ? copy.quality.pathWarnings[warning.code](warning.params ?? {}) : undefined;

export const formatMiningWarning = (
  warning: MiningConversionWarning,
  copy: WorkspaceCopy,
): string => copy.quality.miningWarnings[warning.code](warning.params ?? {});
