'use client';

import type { TraceResult } from '@/lib/image-trace/trace-model';

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
          return (
            <line
              key={`${connector.source}-${connector.target}-${index}`}
              x1={source.bounds.x + source.bounds.width / 2}
              y1={source.bounds.y + source.bounds.height / 2}
              x2={target.bounds.x + target.bounds.width / 2}
              y2={target.bounds.y + target.bounds.height / 2}
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
