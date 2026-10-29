'use client';
import { AppButton } from '@/components/ui/AppButton';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useMiningStore } from '@/lib/mining-store';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { getWorkspaceDocuments } from '@/lib/documents/document-types';
import { downloadTextFile } from '@/lib/browser-file-actions';
import { exportFileName } from '@/lib/file-name';
/** Export derived evidence only. Raw event logs remain a separate explicit download. */
export function MiningEvidenceExport() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getMiningEvidenceCopy(locale);
  const discovery = useMiningStore((state) => state.result);
  const stored = useMiningStore((state) => state.conformance);
  const workspace = useWorkspaceStore();
  if (!discovery) return null;
  const current =
    stored &&
    getWorkspaceDocuments(workspace).some(
      (document) => document.processModel === stored.model,
    )
      ? stored
      : null;
  return (
    <div className="space-y-3 border-t border-[var(--border)] p-4">
      <dl className="grid grid-cols-[1fr_auto] gap-1 text-xs">
        <dt className="col-span-2 font-semibold">{copy.dataQuality}</dt>
        <dt>{copy.skipped}</dt>
        <dd>{discovery.skippedRows}</dd>
        <dt>{copy.invalidTime}</dt>
        <dd>{discovery.invalidTimestamps}</dd>
        <dt>{copy.invalidStart}</dt>
        <dd>{discovery.invalidStartTimes}</dd>
      </dl>
      <AppButton
        className="w-full"
        size="sm"
        onClick={() => {
          const report = {
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
                    options: JSON.parse(current.optionsKey),
                  },
                  conformance: current.evidence.alignment,
                  referenceVerification: current.evidence.verification,
                }
              : {}),
          };
          downloadTextFile(
            exportFileName(discovery.logName, 'analysis', 'json'),
            JSON.stringify(report, null, 2),
            'application/json',
          );
        }}
      >
        {copy.export}
      </AppButton>
    </div>
  );
}
