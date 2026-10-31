import type { MiningDiscoveryResponse } from './mining-engine';
import type { MiningSnapshot } from './mining-tabs';

/** Backward-compatible technical evidence, without source rows or saved file handles. */
export function buildMiningEvidenceReport(
  discovery: MiningDiscoveryResponse,
  current: MiningSnapshot['conformance'],
) {
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    logName: discovery.logName,
    method: 'flowculus-mining-evidence-v1',
    timePolicy: discovery.discovery.timePolicy,
    stats: discovery.discovery.stats,
    filter: discovery.discovery.filter,
    hiddenActivityCount: discovery.discovery.hiddenActivityCount,
    hiddenEdgeCount: discovery.discovery.hiddenEdgeCount,
    quality: {
      skippedRows: discovery.skippedRows,
      invalidTimestamps: discovery.invalidTimestamps,
      invalidStartTimes: discovery.invalidStartTimes,
      missingStartTimes: discovery.missingStartTimes,
      importReview: discovery.importReview ?? null,
    },
    dfg: discovery.discovery.dfg,
    bottlenecks: discovery.discovery.bottlenecks.slice(0, 100),
    variants: discovery.discovery.variants.slice(0, 100).map((variant) => ({
      id: variant.id,
      activities: variant.activities,
      caseCount: variant.caseCount,
      share: variant.share,
      meanLeadTimeMs: variant.meanLeadTimeMs,
      hasRepetition: variant.hasRepetition,
      isHappyPath: variant.isHappyPath,
    })),
    omittedVariantCount: Math.max(0, discovery.discovery.variants.length - 100),
    socialNetwork: discovery.socialNetwork,
    alpha: discovery.alpha,
    alphaVerification: discovery.verification,
    ...(current
      ? {
          reference: {
            id: current.model.id,
            name: current.model.name,
            options: JSON.parse(current.optionsKey) as unknown,
          },
          conformance: current.evidence.alignment,
          referenceVerification: current.evidence.verification,
        }
      : {}),
  };
}
