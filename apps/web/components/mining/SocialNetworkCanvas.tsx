'use client';

import type { SocialNetwork } from '@flowculus/process-mining';

import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const MAX_GRAPH_RESOURCES = 12;
const CENTRE_X = 400;
const CENTRE_Y = 300;
const RADIUS_X = 285;
const RADIUS_Y = 205;

/** A bounded view of the strongest resource handoffs; the full ranking is in Insights. */
export function SocialNetworkCanvas({ network }: Readonly<{ network: SocialNetwork }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const nodes = network.resources.slice(0, MAX_GRAPH_RESOURCES);
  const visible = new Set(nodes.map((node) => node.id));
  const positions = new Map(
    nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
      return [
        node.id,
        {
          x: CENTRE_X + Math.cos(angle) * RADIUS_X,
          y: CENTRE_Y + Math.sin(angle) * RADIUS_Y,
        },
      ] as const;
    }),
  );
  const edges = network.handoffs
    .filter((edge) => visible.has(edge.source) && visible.has(edge.target))
    .slice(0, 36);
  const maxHandoffs = Math.max(1, ...nodes.map((node) => node.handoffs));

  if (!nodes.length) {
    return (
      <p className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--muted)]">
        {copy.miningNoResources}
      </p>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[var(--canvas)] scrollbar-thin">
      <svg
        viewBox="0 0 800 600"
        role="img"
        aria-label={copy.miningNetworkHint}
        className="h-full min-h-[380px] w-full min-w-[600px]"
      >
        <defs>
          <marker
            id="resource-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0 0 L8 4 L0 8 Z" fill="var(--muted)" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const source = positions.get(edge.source);
          const target = positions.get(edge.target);
          if (!source || !target) return null;
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const length = Math.hypot(dx, dy) || 1;
          const offset = 31;
          return (
            <line
              key={`${edge.source}\u0000${edge.target}`}
              x1={source.x + (dx / length) * offset}
              y1={source.y + (dy / length) * offset}
              x2={target.x - (dx / length) * offset}
              y2={target.y - (dy / length) * offset}
              stroke="var(--muted)"
              strokeOpacity="0.48"
              strokeWidth={Math.min(5, 1.5 + Math.sqrt(edge.count))}
              markerEnd="url(#resource-arrow)"
            >
              <title>{`${edge.source} → ${edge.target}: ${edge.count}`}</title>
            </line>
          );
        })}
        {nodes.map((node) => {
          const position = positions.get(node.id);
          if (!position) return null;
          const size = 16 + 11 * Math.sqrt(node.handoffs / maxHandoffs);
          return (
            <g key={node.id} transform={`translate(${position.x} ${position.y})`}>
              <circle
                r={size}
                fill="var(--accent-soft)"
                stroke="var(--accent-strong)"
                strokeWidth="2"
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--accent-strong)"
                fontSize="12"
                fontWeight="700"
              >
                {node.handoffs}
              </text>
              <text
                y={size + 17}
                textAnchor="middle"
                fill="var(--text)"
                fontSize="12"
                fontWeight="600"
              >
                {node.id.length > 17 ? `${node.id.slice(0, 16)}…` : node.id}
              </text>
              <title>{`${node.id}: ${node.handoffs} ${copy.miningHandoffs}`}</title>
            </g>
          );
        })}
      </svg>
      <p className="sr-only">
        {copy.miningShownResources(
          nodes.length,
          network.resources.length + network.omittedResources,
        )}
      </p>
    </div>
  );
}
