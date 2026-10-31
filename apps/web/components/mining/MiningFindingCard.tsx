import { ArrowRight, Lightbulb } from '@phosphor-icons/react';
import type { MiningFinding } from '@/lib/mining-report-findings';
import type { getMiningReportCopy } from '@/lib/i18n/mining-report-copy';

export function MiningFindingCard({
  finding,
  copy,
}: Readonly<{ finding: MiningFinding; copy: ReturnType<typeof getMiningReportCopy> }>) {
  return (
    <article className="mining-report-card" data-tone={finding.tone}>
      <h3>{finding.title}</h3>
      <p>{finding.observation}</p>
      <div className="mining-report-callout">
        <Lightbulb size={17} aria-hidden="true" />
        <p>
          <strong>{copy.meaning}: </strong>
          {finding.meaning}
        </p>
      </div>
      {finding.action ? (
        <p className="mining-report-action">
          <ArrowRight size={16} aria-hidden="true" />
          <span>
            <strong>{copy.action}: </strong>
            {finding.action}
          </span>
        </p>
      ) : null}
    </article>
  );
}
