import type { MiningDiscoveryResponse } from '@/lib/mining-engine';
import type { Locale } from '@/lib/i18n';
import { getMiningDocumentCopy } from '@/lib/i18n/mining-report-document-copy';
import { getMiningReportCopy } from '@/lib/i18n/mining-report-copy';
import { miningReportNarrative } from '@/lib/mining-report-narrative';
import { MiningFindingCard } from './MiningFindingCard';

export function MiningReportOverview({
  result,
  locale,
  duration,
}: Readonly<{
  result: MiningDiscoveryResponse;
  locale: Locale;
  duration: (value: number) => string;
}>) {
  const documentCopy = getMiningDocumentCopy(locale);
  const copy = getMiningReportCopy(locale);
  const narrative = miningReportNarrative(result, locale, duration);
  return (
    <section className="space-y-3">
      <h3>{documentCopy.overview}</h3>
      {narrative.overview.map((text) => (
        <p key={text}>{text}</p>
      ))}
      <details className="mt-4">
        <summary>{documentCopy.logFindings}</summary>
        <div className="space-y-3">
          {narrative.findings.map((finding) => (
            <MiningFindingCard key={finding.id} finding={finding} copy={copy} />
          ))}
          {narrative.limitations.map((text) => (
            <p key={text} className="mining-report-muted">
              {text}
            </p>
          ))}
        </div>
      </details>
    </section>
  );
}
