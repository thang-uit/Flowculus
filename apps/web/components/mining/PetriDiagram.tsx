'use client';
import { useMemo, useState, useId, useRef } from 'react';
import { layoutLayeredGraph } from '@flowculus/graph-layout';
import { petriRuntime, type PetriNet, type Marking } from '@flowculus/process-mining';
import { AppButton } from '@/components/ui/AppButton';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { getWorkspaceCopy } from '@/lib/i18n';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';
export function PetriDiagram({ net, marking }: { net: PetriNet; marking: Marking }) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getMiningEvidenceCopy(locale);
  const common = getWorkspaceCopy(locale);
  const marker = useId().replaceAll(':', '');
  const [zoom, setZoom] = useState(0.75);
  const viewport = useRef<HTMLDivElement>(null);
  const layout = useMemo(() => {
    const nodes = [
      ...net.places.map((place) => ({
        id: place.id,
        label: place.label,
        place: true,
        width: 40,
        height: 40,
      })),
      ...net.transitions.map((transition) => ({
        id: transition.id,
        label: transition.label ?? copy.silent,
        place: false,
        width: 100,
        height: 42,
      })),
    ];
    const links = net.transitions.flatMap((transition) => [
      ...transition.inputs.map((source) => ({ source, target: transition.id })),
      ...transition.outputs.map((target) => ({ source: transition.id, target })),
    ]);
    if (nodes.length > 100)
      return {
        nodes,
        links,
        positions: new Map<string, { x: number; y: number; place: boolean }>(),
        width: 0,
        height: 0,
      };
    const graph = layoutLayeredGraph(nodes, links, {
      startIds: Object.keys(net.initial),
      rankGap: 45,
      nodeGap: 60,
      margin: 30,
    });
    const positions = new Map(
      nodes.map((node) => {
        const point = graph.positions.get(node.id) ?? { x: 0, y: 0 };
        return [
          node.id,
          {
            x: point.x + node.width / 2,
            y: point.y + node.height / 2,
            place: node.place,
          },
        ];
      }),
    );
    return {
      nodes,
      links,
      positions,
      width: Math.max(400, ...[...positions.values()].map((point) => point.x + 80)),
      height: Math.max(160, ...[...positions.values()].map((point) => point.y + 60)),
    };
  }, [net, copy.silent]);
  const runtime = useMemo(() => petriRuntime(net), [net]);
  if (layout.nodes.length > 100) return <p>{copy.graphLimit}</p>;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <AppButton
          size="sm"
          aria-label={common.zoomOut}
          onClick={() => setZoom((value) => Math.max(0.25, value - 0.25))}
        >
          −
        </AppButton>
        <AppButton
          size="sm"
          aria-label={common.fitToCanvas}
          onClick={() => {
            const region = viewport.current;
            if (!region) return;
            setZoom(
              Math.min(
                1,
                region.clientWidth / layout.width,
                region.clientHeight / layout.height,
              ),
            );
            region.scrollTo({ left: 0, top: 0 });
          }}
        >
          {common.fitToCanvas}
        </AppButton>
        <AppButton
          size="sm"
          aria-label={common.zoomIn}
          onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
        >
          +
        </AppButton>
      </div>
      <div
        ref={viewport}
        tabIndex={0}
        role="region"
        aria-label={copy.petri}
        className="focus-ring max-h-80 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--canvas)]"
      >
        <svg
          className="block"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width * zoom}
          height={layout.height * zoom}
          role="img"
          aria-label={copy.petri}
        >
          <defs>
            <marker
              id={marker}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0 0L10 5L0 10Z" fill="var(--muted)" />
            </marker>
          </defs>
          {layout.links.map(({ source, target }, index) => {
            const a = layout.positions.get(source)!;
            const b = layout.positions.get(target)!;
            const length = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
            const nx = (b.x - a.x) / length;
            const ny = (b.y - a.y) / length;
            const distance = (place: boolean) =>
              place
                ? 22
                : Math.min(
                    51 / Math.max(Math.abs(nx), 0.001),
                    23 / Math.max(Math.abs(ny), 0.001),
                  );
            const from = distance(a.place);
            const to = distance(b.place);
            return (
              <line
                key={index}
                x1={a.x + nx * from}
                y1={a.y + ny * from}
                x2={b.x - nx * to}
                y2={b.y - ny * to}
                stroke="var(--muted)"
                strokeWidth={1.2}
                markerEnd={`url(#${marker})`}
              />
            );
          })}
          {layout.nodes.map((node) => {
            const point = layout.positions.get(node.id)!;
            const transition = net.transitions.find((item) => item.id === node.id);
            const enabled = transition ? runtime.enabled(marking, transition) : false;
            return (
              <g key={node.id}>
                <title>
                  {node.id}: {node.label}
                </title>
                {node.place ? (
                  <>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={20}
                      fill="var(--surface)"
                      stroke="var(--text)"
                    />
                    <text
                      x={point.x}
                      y={point.y + 4}
                      textAnchor="middle"
                      fill="var(--text)"
                    >
                      {marking[node.id] ?? 0}
                    </text>
                  </>
                ) : (
                  <rect
                    x={point.x - 50}
                    y={point.y - 21}
                    width={100}
                    height={42}
                    rx={3}
                    fill={enabled ? 'var(--accent-soft)' : 'var(--surface)'}
                    stroke={enabled ? 'var(--accent-strong)' : 'var(--muted)'}
                  />
                )}
                <text
                  x={point.x}
                  y={point.y + (node.place ? 36 : 4)}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--text)"
                >
                  {node.label.length > 16 ? node.label.slice(0, 15) + '…' : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
