import type { AlignmentConformance } from '@flowculus/process-mining';
import { getMiningReportCopy } from '@/lib/i18n/mining-report-copy';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';
import type { Locale } from '@/lib/i18n';
import { MiningReportMetrics } from './MiningReportMetrics';
import { MiningDeviationList } from './MiningDeviationList';

export function MiningConformanceResults({
  alignment,
  locale,
}: Readonly<{ alignment: AlignmentConformance; locale: Locale }>) {
  const copy = getMiningReportCopy(locale),
    evidence = getMiningEvidenceCopy(locale);
  const count = (value: number) => new Intl.NumberFormat(locale).format(value);
  const percent = (value: number | null) =>
    value == null
      ? evidence.unknown
      : new Intl.NumberFormat(locale, {
          style: 'percent',
          maximumFractionDigits: 2,
        }).format(value);
  const differences = Math.max(0, alignment.examinedCases - alignment.compatibleCases);
  const quality = alignment.quality;
  return (
    <section className="space-y-4" aria-label={copy.comparison}>
      <h3>{copy.comparison}</h3>
      {alignment.status !== 'ready' ? (
        <p className="mining-report-status" data-tone="attention">
          {copy.partial}
        </p>
      ) : null}
      <MiningReportMetrics
        label={copy.comparison}
        items={[
          { label: copy.fitness, value: percent(alignment.fitness), tone: 'neutral' },
          {
            label: copy.compatible,
            value: `${count(alignment.compatibleCases)} / ${count(alignment.examinedCases)}`,
            tone:
              alignment.examinedCases > 0 && differences === 0 ? 'positive' : 'neutral',
          },
          {
            label: copy.deviations,
            value: count(differences),
            tone: differences ? 'danger' : 'positive',
          },
          {
            label: copy.omitted,
            value: count(alignment.omittedCases),
            tone: alignment.omittedCases ? 'attention' : 'neutral',
          },
        ]}
      />
      <p className="mining-report-muted">{copy.fitnessMeaning}</p>
      <MiningDeviationList alignment={alignment} locale={locale} />
      {quality ? (
        <details>
          <summary>{copy.quality}</summary>
          <p className="mining-report-muted mb-3">
            {copy.coverage(
              count(quality.compatibleCases),
              count(alignment.examinedCases),
            )}
          </p>
          {quality.compatibleCases === 0 ? (
            <p className="mining-report-muted mb-3">{copy.noPrecision}</p>
          ) : null}
          <div className="space-y-3">
            {[
              {
                label: evidence.precision,
                value: quality.precision,
                meaning: copy.precisionMeaning,
              },
              {
                label: evidence.generalization,
                value: quality.generalization,
                meaning: copy.generalizationMeaning,
              },
              {
                label: evidence.simplicity,
                value: quality.simplicity,
                meaning: copy.simplicityMeaning,
              },
            ].map((metric) => (
              <div key={metric.label}>
                <h4>
                  {metric.label}: {percent(metric.value)}
                </h4>
                <p className="mining-report-muted">{metric.meaning}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}
      <details>
        <summary>{copy.technical}</summary>
        <p className="mining-report-muted">{evidence.method}</p>
        {quality ? <p className="mining-report-muted">{evidence.qualityScope}</p> : null}
      </details>
    </section>
  );
}
