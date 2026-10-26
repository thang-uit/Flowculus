'use client';

import type { TraceResult } from '@/lib/image-trace/trace-model';
import { routeOrthogonalEdge, roundedPolylinePath } from '@flowculus/graph-layout';

export function ImageTracePreview({
  draft,
  imageUrl,
  focusId,
  label,
}: Readonly<{
  draft: TraceResult;
  imageUrl: string;
  focusId: string | null;
  label: string;
}>) {
  const byId = new Map(draft.candidates.map((candidate) => [candidate.id, candidate]));
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--canvas)]">
      <svg
        viewBox={`0 0 ${draft.width} ${draft.height}`}
        className="block h-auto max-h-[45dvh] w-full"
        role="img"
        aria-label={label}
      >
        <image href={imageUrl} x="0" y="0" width={draft.width} height={draft.height} />
        {draft.connectors.map((connector, index) => {
          const source = byId.get(connector.source);
          const target = byId.get(connector.target);
          if (!source || !target) return null;
          const route = routeOrthogonalEdge(source.bounds, target.bounds, {
            sourceSide: connector.sourceSide,
            targetSide: connector.targetSide,
          });
          return (
            <path
              key={`${connector.source}-${connector.target}-${index}`}
              d={roundedPolylinePath(route.points, 5)}
              fill="none"
              stroke="var(--accent-strong)"
              strokeWidth={Math.max(2, draft.width / 500)}
              strokeDasharray="8 5"
            />
          );
        })}
        {draft.candidates.map((candidate) => (
          <rect
            key={candidate.id}
            x={candidate.bounds.x}
            y={candidate.bounds.y}
            width={candidate.bounds.width}
            height={candidate.bounds.height}
            fill="color-mix(in srgb, var(--accent) 10%, transparent)"
            stroke={candidate.id === focusId ? 'var(--danger)' : 'var(--accent-strong)'}
            strokeWidth={candidate.id === focusId ? 5 : 2}
          />
        ))}
      </svg>
    </div>
  );
}
