'use client';

import {
  CheckCircle,
  Function,
  Info,
  Warning,
  WarningCircle,
} from '@phosphor-icons/react';
import { useState } from 'react';

import { FormulaMath } from '@/components/FormulaMath';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { getWorkspaceCopy } from '@/lib/i18n';
import { localizeAnalysisMessage } from '@/lib/localize-analysis';
import { useWorkspaceStore } from '@/lib/workspace-store';

export function AnalysisDetails() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const report = useWorkspaceStore((state) => state.analysisReport);
  const [isOpen, setIsOpen] = useState(true);
  const statusIcon = report.status === 'ready' ? CheckCircle : WarningCircle;
  const StatusIcon = statusIcon;

  return (
    <CollapsibleSection
      open={isOpen}
      onOpenChange={setIsOpen}
      title={copy.formula}
      description={copy.analysisQualityHint}
      icon={<Function size={16} aria-hidden="true" />}
      badge={
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--muted)]">
          <StatusIcon
            size={14}
            weight="fill"
            className={
              report.status === 'ready'
                ? 'text-[var(--success)]'
                : 'text-[var(--accent-strong)]'
            }
            aria-hidden="true"
          />
          {report.quality === 'exact'
            ? copy.exact
            : report.quality === 'assumption'
              ? copy.assumption
              : copy.simulationRequired}
        </span>
      }
      className="border-t border-[var(--border)] bg-[var(--surface)]"
      headerClassName="px-4 sm:px-6 py-3"
      contentClassName="grid gap-4 border-t border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]"
    >
      {/* Left Column: Mathematical Breakdown Formulas */}
      <div className="space-y-3 overflow-hidden">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          {copy.formulaBreakdown}
        </p>

        {/* Cycle Time (CT) Formula */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xs transition-colors hover:border-[var(--border-strong)]">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[var(--accent-strong)]">
              {copy.cycleFormulaLabel} ({copy.cycleTime})
            </span>
            <span className="text-[10px] text-[var(--muted)]">
              {copy.cycleTimeFormulaDesc}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto rounded-lg bg-[var(--canvas)] p-2.5 scrollbar-thin">
            <span className="shrink-0 font-mono text-xs font-bold text-[var(--accent-strong)]">
              CT =
            </span>
            {report.formulaAst ? (
              <FormulaMath formula={report.formulaAst} />
            ) : (
              <span className="whitespace-nowrap font-mono text-xs font-semibold text-[var(--text)]">
                {report.formula}
              </span>
            )}
          </div>
        </div>

        {/* Theoretical Cycle Time (TCT) Formula */}
        {report.theoreticalFormula ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xs transition-colors hover:border-[var(--border-strong)]">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[var(--muted-strong)]">
                {copy.theoreticalFormulaLabel} ({copy.theoreticalTime})
              </span>
              <span className="text-[10px] text-[var(--muted)]">
                {copy.theoreticalTimeFormulaDesc}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto rounded-lg bg-[var(--canvas)] p-2.5 scrollbar-thin">
              <span className="shrink-0 font-mono text-xs font-bold text-[var(--muted-strong)]">
                TCT =
              </span>
              {report.theoreticalFormulaAst ? (
                <FormulaMath formula={report.theoreticalFormulaAst} />
              ) : (
                <span className="whitespace-nowrap font-mono text-xs font-semibold text-[var(--muted-strong)]">
                  {report.theoreticalFormula}
                </span>
              )}
            </div>
          </div>
        ) : null}

        {/* Cost Formula */}
        {report.costFormula ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xs transition-colors hover:border-[var(--border-strong)]">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[var(--muted-strong)]">
                {copy.costFormulaLabel} ({copy.cost})
              </span>
              <span className="text-[10px] text-[var(--muted)]">
                {copy.costFormulaDesc}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto rounded-lg bg-[var(--canvas)] p-2.5 scrollbar-thin">
              <span className="shrink-0 font-mono text-xs font-bold text-[var(--muted-strong)]">
                Cost =
              </span>
              {report.costFormulaAst ? (
                <FormulaMath formula={report.costFormulaAst} />
              ) : (
                <span className="whitespace-nowrap font-mono text-xs font-semibold text-[var(--muted-strong)]">
                  {report.costFormula}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Right Column: Assumptions & Warnings */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          {copy.assumptionsAndContext}
        </p>

        {/* Assumptions Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[var(--muted-strong)]">
            <Info size={15} className="text-[var(--accent-strong)]" aria-hidden="true" />
            <span>{copy.assumptions}</span>
          </div>
          {report.assumptions.length ? (
            <ul className="space-y-1.5 text-xs text-[var(--muted-strong)]">
              {report.assumptions.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent-strong)]" />
                  <span className="leading-relaxed">
                    {localizeAnalysisMessage(item, locale)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--muted)]">{copy.noAssumptions}</p>
          )}
        </div>

        {/* Warnings Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[var(--muted-strong)]">
            <Warning
              size={15}
              className={
                report.warnings.length ? 'text-[var(--danger)]' : 'text-[var(--muted)]'
              }
              aria-hidden="true"
            />
            <span>{copy.warnings}</span>
          </div>
          {report.warnings.length ? (
            <ul className="space-y-1.5 text-xs text-[var(--danger)]">
              {report.warnings.map((warning) => (
                <li key={warning} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--danger)]" />
                  <span className="leading-relaxed">
                    {localizeAnalysisMessage(warning, locale)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--muted)]">{copy.noWarnings}</p>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}
