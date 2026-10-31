import type { SocialNetwork } from '@flowculus/process-mining';
import { miningResourceFindings } from '@/lib/mining-report-findings';
import { getMiningReportCopy } from '@/lib/i18n/mining-report-copy';
import type { Locale } from '@/lib/i18n';
import { MiningFindingCard } from './MiningFindingCard';

export function MiningResourceFindings({
  network,
  locale,
}: Readonly<{ network: SocialNetwork; locale: Locale }>) {
  const copy = getMiningReportCopy(locale);
  return (
    <div className="space-y-3">
      {miningResourceFindings(network, locale).map((finding) => (
        <MiningFindingCard key={finding.id} finding={finding} copy={copy} />
      ))}
    </div>
  );
}
