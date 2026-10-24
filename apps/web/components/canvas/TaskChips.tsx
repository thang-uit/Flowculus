'use client';

import { activityTimeTerms, resolveActivityTime } from '@flowculus/analysis-engine';
import { formatCompactMinutes } from '@flowculus/file-formats';
import type { ProcessNode } from '@flowculus/process-model';

import { formatCost, formatPercent } from '@/lib/format';
import type { WorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

/** CT/T/Wq, rate and rework chips; the tooltip names the cycle-time source. */
export function TaskChips({
  node,
  copy,
}: Readonly<{ node: ProcessNode; copy: WorkspaceCopy }>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const source = resolveActivityTime(node).cycleTimeSource;
  const sourceNote = `${copy.quality.cycleTimeSourceLabel}: ${copy.quality.cycleTimeSource[source]}`;
  const titles = { CT: copy.cycleMinutes, T: copy.processing, Wq: copy.waiting };
  const chips: Array<{ key: string; text: string; title: string; accent?: boolean }> =
    activityTimeTerms(node).map((term) => ({
      key: term.symbol,
      text: `${term.symbol} ${formatCompactMinutes(term.minutes)}`,
      title: `${titles[term.symbol]} · ${sourceNote}`,
    }));
  if (node.cost?.resourceRatePerHour != null) {
    chips.push({
      key: 'rate',
      text: `${formatCost(node.cost.resourceRatePerHour, node.cost.currency, locale)}/h`,
      title: copy.hourlyRate,
    });
  } else if (node.cost?.otherCostPerExecution != null) {
    chips.push({
      key: 'fixed',
      text: formatCost(node.cost.otherCostPerExecution, node.cost.currency, locale) ?? '',
      title: copy.fixedCost,
    });
  }
  if (node.reworkProbability != null && node.reworkProbability > 0) {
    chips.push({
      key: 'r',
      text: `r ${formatPercent(node.reworkProbability, 0)}`,
      title: copy.rework,
      accent: true,
    });
  }
  return (
    <div className="flow-chips">
      {chips.length === 0 ? (
        <span className="flow-chip flow-chip--empty" title={sourceNote}>
          CT –
        </span>
      ) : (
        chips.map((chip) => (
          <span
            key={chip.key}
            className={chip.accent ? 'flow-chip flow-chip--accent' : 'flow-chip'}
            title={chip.title}
          >
            {chip.text}
          </span>
        ))
      )}
    </div>
  );
}
