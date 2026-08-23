'use client';

import type { ProcessModel, ProcessNode } from '@flowculus/process-model';
import { useMemo } from 'react';
import { Eye, GitFork } from '@phosphor-icons/react';

import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';

interface PreviewPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_PREVIEW_NODES = 160;
const PREVIEW_COLUMN_WIDTH = 220;
const PREVIEW_WIDTH = 1160;
const PREVIEW_TOP = 82;

const isControlEdge = (kind: ProcessModel['edges'][string]['kind']): boolean =>
  kind == null || kind === 'sequence';

const nodeDimensions = (node: ProcessNode): Pick<PreviewPosition, 'width' | 'height'> => {
  if (node.kind === 'gateway') return { width: 76, height: 76 };
  if (node.kind === 'start' || node.kind === 'end' || node.kind === 'event') {
    return { width: 58, height: 58 };
  }
  if (node.kind === 'data' || node.kind === 'annotation') {
    return { width: 142, height: 70 };
  }
  return { width: 154, height: 72 };
};

const splitLabel = (label: string, maxLength = 22): string[] => {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 3);
};

const buildPositions = (model: ProcessModel): Map<string, PreviewPosition> => {
  const nodes = Object.values(model.nodes).slice(0, MAX_PREVIEW_NODES);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, number>();
  nodes.forEach((node) => {
    outgoing.set(node.id, []);
    incoming.set(node.id, 0);
  });
  Object.values(model.edges).forEach((edge) => {
    if (
      !isControlEdge(edge.kind) ||
      !nodeIds.has(edge.source) ||
      !nodeIds.has(edge.target)
    )
      return;
    outgoing.get(edge.source)?.push(edge.target);
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  });

  const ranks = new Map<string, number>();
  const queue = nodes
    .filter((node) => node.kind === 'start' || (incoming.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  if (queue.length === 0 && nodes[0]) queue.push(nodes[0].id);
  queue.forEach((nodeId) => ranks.set(nodeId, 0));
  for (let index = 0; index < queue.length; index += 1) {
    const sourceId = queue[index];
    const rank = ranks.get(sourceId) ?? 0;
    for (const targetId of outgoing.get(sourceId) ?? []) {
      const nextRank = Math.min(rank + 1, 5);
      if ((ranks.get(targetId) ?? -1) < nextRank) ranks.set(targetId, nextRank);
      if (!queue.includes(targetId)) queue.push(targetId);
    }
  }
  nodes.forEach((node, index) => {
    if (!ranks.has(node.id)) ranks.set(node.id, Math.min(5, index));
  });

  const columns = new Map<number, ProcessNode[]>();
  nodes.forEach((node) => {
    const rank = ranks.get(node.id) ?? 0;
    const column = columns.get(rank) ?? [];
    column.push(node);
    columns.set(rank, column);
  });

  const positions = new Map<string, PreviewPosition>();
  for (const [rank, column] of columns) {
    const totalHeight =
      column.reduce((sum, node) => sum + nodeDimensions(node).height, 0) +
      Math.max(0, column.length - 1) * 30;
    let y = Math.max(PREVIEW_TOP, 250 - totalHeight / 2);
    column.forEach((node) => {
      const dimensions = nodeDimensions(node);
      positions.set(node.id, {
        x: 72 + rank * PREVIEW_COLUMN_WIDTH,
        y,
        ...dimensions,
      });
      y += dimensions.height + 30;
    });
  }
  return positions;
};

const centerOf = (position: PreviewPosition): { x: number; y: number } => ({
  x: position.x + position.width / 2,
  y: position.y + position.height / 2,
});

function PreviewNode({
  node,
  position,
  selected,
  onSelect,
}: Readonly<{
  node: ProcessNode;
  position: PreviewPosition;
  selected: boolean;
  onSelect: () => void;
}>) {
  const lines = splitLabel(node.label);
  const center = centerOf(position);
  const isGateway = node.kind === 'gateway';
  const isCircle = node.kind === 'start' || node.kind === 'end' || node.kind === 'event';
  const fill = isGateway ? 'var(--accent-soft)' : 'var(--surface)';
  const stroke = selected
    ? 'var(--accent-strong)'
    : isGateway
      ? 'var(--accent-strong)'
      : 'var(--border-strong)';
  const titleY = center.y - (lines.length - 1) * 7;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={node.label}
      className="cursor-pointer outline-none"
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <title>{node.label}</title>
      {isGateway ? (
        <polygon
          points={`${center.x},${position.y} ${position.x + position.width},${center.y} ${center.x},${position.y + position.height} ${position.x},${center.y}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={selected ? 3 : 2}
        />
      ) : isCircle ? (
        <circle
          cx={center.x}
          cy={center.y}
          r={Math.min(position.width, position.height) / 2 - 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={selected ? 4 : node.kind === 'end' ? 4 : 2}
        />
      ) : node.kind === 'data' ? (
        <polygon
          points={`${position.x + 14},${position.y} ${position.x + position.width},${position.y} ${position.x + position.width - 14},${position.y + position.height} ${position.x},${position.y + position.height}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={selected ? 3 : 2}
        />
      ) : (
        <rect
          x={position.x}
          y={position.y}
          width={position.width}
          height={position.height}
          rx={node.kind === 'annotation' ? 4 : 10}
          fill={fill}
          stroke={stroke}
          strokeWidth={selected ? 3 : 2}
          strokeDasharray={node.kind === 'annotation' ? '5 4' : undefined}
        />
      )}
      {isGateway ? (
        <text
          x={center.x}
          y={center.y + 5}
          textAnchor="middle"
          className="fill-[var(--accent-strong)] font-mono text-[18px] font-semibold"
        >
          {node.gatewayKind === 'and' ? '+' : node.gatewayKind === 'or' ? 'O' : '×'}
        </text>
      ) : null}
      <text
        x={center.x}
        y={isCircle ? position.y + position.height + 20 : titleY}
        textAnchor="middle"
        className="fill-[var(--text)] text-[12px] font-medium"
      >
        {lines.map((line, index) => (
          <tspan key={`${node.id}-${index}`} x={center.x} dy={index === 0 ? 0 : 15}>
            {line}
          </tspan>
        ))}
      </text>
      {!isCircle && node.kind !== 'gateway' && node.durationMinutes != null ? (
        <text
          x={center.x}
          y={position.y + position.height - 12}
          textAnchor="middle"
          className="fill-[var(--muted)] font-mono text-[10px]"
        >
          {Number(node.durationMinutes.toFixed(2))} min
        </text>
      ) : null}
    </g>
  );
}

export function FallbackCanvasPreview() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const model = useWorkspaceStore((state) => state.processModel);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore((state) => state.setSelectedNodeId);
  const positions = useMemo(() => buildPositions(model), [model]);
  const nodes = Object.values(model.nodes).filter((node) => positions.has(node.id));
  const edges = Object.values(model.edges).filter(
    (edge) =>
      isControlEdge(edge.kind) &&
      positions.has(edge.source) &&
      positions.has(edge.target),
  );
  const height = Math.max(
    420,
    ...[...positions.values()].map((position) => position.y + position.height + 90),
  );

  return (
    <div className="absolute inset-0 z-[1] overflow-auto bg-[var(--surface-raised)] canvas-grid">
      <div className="sticky left-3 top-3 z-[2] m-3 flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-2.5 py-1.5 text-[11px] shadow-[var(--shadow-soft)] backdrop-blur-sm">
        <Eye
          size={14}
          className="shrink-0 text-[var(--accent-strong)]"
          aria-hidden="true"
        />
        <span className="font-medium text-[var(--muted-strong)]">
          {copy.fallbackCanvas}
        </span>
        <span className="truncate text-[var(--muted)]">{copy.fallbackReadOnly}</span>
      </div>
      <div className="flex min-w-[760px] justify-center px-4 pb-8">
        <svg
          role="img"
          aria-label={`${copy.fallbackCanvas}: ${model.name}`}
          width={PREVIEW_WIDTH}
          height={height}
          viewBox={`0 0 ${PREVIEW_WIDTH} ${height}`}
          className="max-w-none overflow-visible"
        >
          <title>{`${model.name} / ${copy.fallbackReadOnly}`}</title>
          <defs>
            <marker
              id="flowculus-preview-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 z" fill="var(--muted-strong)" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            const start = { x: source.x + source.width, y: source.y + source.height / 2 };
            const end = { x: target.x, y: target.y + target.height / 2 };
            const curve = Math.max(36, (end.x - start.x) * 0.42);
            return (
              <path
                key={edge.id}
                d={`M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`}
                fill="none"
                stroke="var(--muted-strong)"
                strokeWidth="1.7"
                strokeDasharray={edge.kind === 'unknown' ? '5 4' : undefined}
                markerEnd="url(#flowculus-preview-arrow)"
              />
            );
          })}
          {nodes.map((node) => {
            const position = positions.get(node.id);
            return position ? (
              <PreviewNode
                key={node.id}
                node={node}
                position={position}
                selected={selectedNodeId === node.id}
                onSelect={() => setSelectedNodeId(node.id)}
              />
            ) : null;
          })}
        </svg>
      </div>
      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-3 py-2 text-[11px] text-[var(--muted)] shadow-[var(--shadow-soft)] backdrop-blur-sm">
        <GitFork size={14} aria-hidden="true" />
        <span>{copy.fallbackCanvasDescription}</span>
      </div>
    </div>
  );
}
