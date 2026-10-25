'use client';

import { Function } from '@phosphor-icons/react';
import { useState } from 'react';

import { CriticalPathPanel } from '@/components/analysis/CriticalPathPanel';
import { FormulaCard } from '@/components/analysis/FormulaCard';
import { IssueList } from '@/components/analysis/IssueList';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { QualityBadge } from '@/components/ui/QualityBadge';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/**
 * Formula ASTs (CT, TCT, cost), the CPM and critical-chain results and every
 * finding of the engine. A missing AST is stated, never faked.
 */
export function AnalysisDetails() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const report = useWorkspaceStore((state) => state.analysisReport);
  const [isOpen, setIsOpen] = useState(true);
  const unavailable =
    report.status === 'empty' ? copy.emptyAnalysis : copy.quality.simulationNoNumber;

  return (
    <CollapsibleSection
      open={isOpen}
      onOpenChange={setIsOpen}
      title={copy.formula}
      description={copy.analysisQualityHint}
      icon={<Function size={16} aria-hidden="true" />}
      badge={
        report.status === 'empty' ? null : (
          <QualityBadge quality={report.quality} copy={copy} size="sm" />
        )
      }
      className="border-t border-[var(--border)] bg-[var(--surface)]"
      headerClassName="px-4 sm:px-6 py-3"
      contentClassName="grid gap-4 border-t border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]"
    >
      <div className="min-w-0 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          {copy.formulaBreakdown}
        </p>
        <FormulaCard
          title={`${copy.cycleFormulaLabel} (${copy.cycleTime})`}
          description={copy.cycleTimeFormulaDesc}
          symbol="CT"
          ast={report.formulaAst}
          fallback={unavailable}
          accent
        />
        <FormulaCard
          title={`${copy.theoreticalFormulaLabel} (${copy.theoreticalTime})`}
          description={copy.theoreticalTimeFormulaDesc}
          symbol="TCT"
          ast={report.theoreticalFormulaAst}
          fallback={unavailable}
        />
        <FormulaCard
          title={`${copy.costFormulaLabel} (${copy.cost})`}
          description={copy.costFormulaDesc}
          symbol="Cost"
          ast={report.costFormulaAst}
          fallback={unavailable}
        />
        <CriticalPathPanel report={report} />
      </div>
      <div className="min-w-0 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          {copy.assumptionsAndContext}
        </p>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <IssueList issues={report.issues} />
        </div>
      </div>
    </CollapsibleSection>
  );
}
