'use client';
import { useMemo, useState } from 'react';
import {
  petriRuntime,
  petriToPnml,
  type PetriNet,
  type PetriVerification,
  type Marking,
} from '@flowculus/process-mining';
import { AppButton } from '@/components/ui/AppButton';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { downloadTextFile } from '@/lib/browser-file-actions';
import { exportFileName } from '@/lib/file-name';
import { PetriDiagram } from './PetriDiagram';
export function PetriNetView({
  net,
  verification,
}: {
  net: PetriNet;
  verification: PetriVerification | null;
}) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getMiningEvidenceCopy(locale);
  const runtime = useMemo(() => petriRuntime(net), [net]);
  const [state, setState] = useState<{ net: PetriNet; marking: Marking; path: string[] }>(
    { net, marking: net.initial, path: [] },
  );
  const current = state.net === net ? state : { net, marking: net.initial, path: [] };
  const fire = (id: string) => {
    const marking = runtime.fire(current.marking, id);
    if (marking) setState({ net, marking, path: [...current.path, id].slice(-100) });
  };
  const verdict = (value: boolean | null) =>
    value == null ? copy.unknown : value ? copy.pass : copy.fail;
  return (
    <section className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{copy.petri}</h3>
        <AppButton
          size="sm"
          onClick={() =>
            downloadTextFile(
              exportFileName(net.name, 'model', 'pnml'),
              petriToPnml(net),
              'application/xml',
            )
          }
        >
          {copy.pnml}
        </AppButton>
      </div>
      <PetriDiagram net={net} marking={current.marking} />
      <div className="flex flex-wrap gap-2">
        <AppButton
          size="sm"
          onClick={() => setState({ net, marking: net.initial, path: [] })}
        >
          {copy.initial}
        </AppButton>
        {net.transitions
          .filter((transition) => runtime.enabled(current.marking, transition))
          .map((transition) => (
            <AppButton
              size="sm"
              key={transition.id}
              onClick={() => fire(transition.id)}
              title={transition.id}
            >
              {copy.fire}:{' '}
              {transition.label ??
                `${copy.silent} · ${transition.sourceId ?? transition.id}`}
            </AppButton>
          ))}
      </div>
      <details>
        <summary className="cursor-pointer font-semibold">{copy.tokens}</summary>
        <dl className="grid grid-cols-2 gap-1">
          {net.places.map((place) => (
            <div key={place.id}>
              <dt className="break-words text-[var(--muted)]">{place.label}</dt>
              <dd>{current.marking[place.id] ?? 0}</dd>
            </div>
          ))}
        </dl>
      </details>
      {verification ? (
        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <h3 className="font-semibold">{copy.verification}</h3>
          <p>{verification.status === 'complete' ? copy.complete : copy.limit}</p>
          <p>
            {copy.states}: {verification.states}
          </p>
          <p>
            {copy.safe}: {verdict(verification.safe)}
          </p>
          <p>
            {copy.sound}: {verdict(verification.sound)}
          </p>
          {verification.deadlocks.length ? (
            <p>
              {copy.deadlock}: {verification.deadlocks.length}
            </p>
          ) : null}
          {verification.counterexample ? (
            <details>
              <summary>{copy.path}</summary>
              <p className="break-words">{verification.counterexample.join(' → ')}</p>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
