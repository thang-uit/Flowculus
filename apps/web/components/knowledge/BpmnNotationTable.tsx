'use client';

import { useId } from 'react';
import { ShapePaletteGlyph } from '@/components/palette/ShapePaletteGlyph';
import { NOTATION_COPY, type NotationKind } from '@/lib/i18n/knowledge/notation';
import { isSemanticShapeTool } from '@/lib/shape-tools';
import { usePreferencesStore } from '@/lib/use-preferences-store';

function NotationGlyph({ kind }: Readonly<{ kind: NotationKind }>) {
  const id = `notation-${useId().replace(/:/g, '')}`;
  if (isSemanticShapeTool(kind)) return <ShapePaletteGlyph tool={kind} />;
  return (
    <svg
      width="64"
      height="28"
      viewBox="0 0 64 28"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <defs>
        <marker
          id={id}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path
            d="M 0 0 L 10 5 L 0 10"
            fill={kind === 'sequence-flow' ? 'currentColor' : 'none'}
          />
        </marker>
      </defs>
      <path
        d="M 6 14 H 57"
        strokeWidth="1.5"
        strokeDasharray={
          kind === 'message-flow' ? '7 4' : kind === 'association' ? '2 4' : undefined
        }
        markerEnd={kind === 'association' ? undefined : `url(#${id})`}
      />
      {kind === 'message-flow' ? (
        <circle cx="6" cy="14" r="3" fill="var(--surface)" strokeWidth="1.5" />
      ) : null}
    </svg>
  );
}

export function BpmnNotationTable() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = NOTATION_COPY[locale];
  return (
    <div className="knowledge-notation" role="region" aria-label={copy.caption}>
      <table>
        <caption>{copy.caption}</caption>
        <thead>
          <tr>
            {copy.headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {copy.rows.map((row) => (
            <tr key={row.kind}>
              <th scope="row">
                <span className="knowledge-notation-symbol">
                  <NotationGlyph kind={row.kind} />
                  <span>{row.label}</span>
                </span>
              </th>
              <td>{row.meaning}</td>
              <td>{row.support}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-[var(--muted-strong)]">
        <a
          className="focus-ring underline underline-offset-4"
          href="https://www.omg.org/spec/BPMN/2.0.2/PDF"
          target="_blank"
          rel="noopener noreferrer"
        >
          {copy.source}
        </a>
      </p>
    </div>
  );
}
