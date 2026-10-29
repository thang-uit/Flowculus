'use client';

import { miningConclusions } from '@/lib/mining-conclusions';
import { getMiningConclusionsCopy } from '@/lib/i18n/mining-conclusions-copy';
import { useMiningStore } from '@/lib/mining-store';
import { useMiningDuration } from '@/lib/use-mining-duration';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { getWorkspaceDocuments } from '@/lib/documents/document-types';
import type { MiningDiscoveryResponse } from '@/lib/mining-engine';

export function MiningConclusions({
  result,
}: Readonly<{ result: MiningDiscoveryResponse }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const duration = useMiningDuration();
  const stored = useMiningStore((state) => state.conformance);
  const workspace = useWorkspaceStore();
  const reference =
    stored &&
    getWorkspaceDocuments(workspace).some(
      (document) => document.processModel === stored.model,
    )
      ? stored
      : null;
  const copy = getMiningConclusionsCopy(locale);
  const sections = miningConclusions(
    result,
    locale,
    duration,
    reference ? { name: reference.model.name, evidence: reference.evidence } : undefined,
  );
  return (
    <section
      className="space-y-5 text-xs leading-5 text-[var(--text)]"
      aria-label={copy.title}
    >
      <div>
        <h2 className="break-words text-sm font-semibold">
          {copy.source(result.logName)}
        </h2>
        <p className="mt-2 text-[var(--muted-strong)]">{copy.scope}</p>
      </div>
      {sections.map((section) => (
        <section key={section.title} className="border-t border-[var(--border)] pt-4">
          <h3 className="font-semibold">{section.title}</h3>
          <ul className="mt-2 list-disc space-y-3 break-words pl-4">
            {section.paragraphs.map((paragraph, index) => (
              <li key={index}>{paragraph}</li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
