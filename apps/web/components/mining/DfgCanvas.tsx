'use client';

import {
  Background,
  BackgroundVariant,
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useInternalNode,
  useReactFlow,
  useStoreApi,
  type EdgeProps,
  type InternalNode,
  type NodeProps,
  type Node,
} from '@xyflow/react';
import { memo, useEffect, useMemo } from 'react';

import {
  roundedPolylinePath,
  routeOrthogonalEdge,
  type Rect,
} from '@flowculus/graph-layout';
import { useMiningDuration } from '@/lib/use-mining-duration';
import type { DirectlyFollowsGraph, TraceVariant } from '@flowculus/process-mining';

import {
  buildDfgFlow,
  type DfgActivityNodeData,
  type DfgFlowEdge,
  type DfgFlowNode,
  type DfgTerminalNodeData,
} from '@/lib/dfg-flow';
import { formatInteger } from '@/lib/format';
import { getWorkspaceCopy } from '@/lib/i18n';
import { getMiningDataCopy } from '@/lib/i18n/mining-data-copy';
import type { DfgEdgeMetric } from '@/lib/mining-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const hiddenHandles = (
  <>
    <Handle
      type="target"
      position={Position.Left}
      className="!opacity-0"
      isConnectable={false}
    />
    <Handle
      type="source"
      position={Position.Right}
      className="!opacity-0"
      isConnectable={false}
    />
  </>
);

const ActivityNode = memo(function ActivityNode({
  data,
}: NodeProps<Node<DfgActivityNodeData, 'activity'>>) {
  const formatDurationMs = useMiningDuration();
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const dataCopy = getMiningDataCopy(locale);
  const { activity } = data;
  const share = activity.frequency / Math.max(1, data.maxFrequency);
  return (
    <div
      className="dfg-activity"
      data-dimmed={data.dimmed || undefined}
      data-highlight={data.highlighted || undefined}
      title={`${activity.id} — ${copy.miningFrequency}: ${activity.frequency}`}
    >
      {hiddenHandles}
      <span className="truncate text-[12px] font-semibold text-[var(--text)]">
        {activity.id}
      </span>
      <span className="flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--muted)]">
        <span>
          {formatInteger(activity.frequency, locale)}× ·{' '}
          {dataCopy.caseCount(
            activity.caseFrequency,
            formatInteger(activity.caseFrequency, locale),
          )}
        </span>
        {activity.meanServiceMs != null ? (
          <span>T {formatDurationMs(activity.meanServiceMs)}</span>
        ) : null}
      </span>
      <span className="dfg-activity__bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${Math.max(0.04, share)})` }} />
      </span>
    </div>
  );
});

const TerminalNode = memo(function TerminalNode({
  data,
}: NodeProps<Node<DfgTerminalNodeData, 'terminal'>>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  return (
    <div
      className="dfg-terminal"
      style={data.terminal === 'end' ? { borderWidth: 3 } : undefined}
    >
      {hiddenHandles}
      {data.terminal === 'start' ? copy.miningStart : copy.miningEnd}
    </div>
  );
});

const rectOf = (node: InternalNode): Rect => ({
  x: node.internals.positionAbsolute.x,
  y: node.internals.positionAbsolute.y,
  width: node.measured.width ?? node.width ?? 0,
  height: node.measured.height ?? node.height ?? 0,
});

const DfgEdgeView = memo(function DfgEdgeView({
  id,
  source,
  target,
  data,
}: EdgeProps<DfgFlowEdge>) {
  const formatDurationMs = useMiningDuration();
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode || !data) return null;
  const sourceRect = rectOf(sourceNode);
  let path: string;
  let labelPoint: { x: number; y: number };
  if (source === target) {
    const { x, y, width } = sourceRect;
    path = `M ${x + width - 24} ${y} C ${x + width - 18} ${y - 46}, ${x + width + 34} ${y - 30}, ${x + width} ${y + 14}`;
    labelPoint = { x: x + width + 6, y: y - 26 };
  } else {
    const route = routeOrthogonalEdge(sourceRect, rectOf(targetNode), {}, data.obstacles);
    path = roundedPolylinePath(route.points, 12);
    labelPoint = route.labelPoint;
  }
  const colour =
    data.slowness > 0.66
      ? 'var(--danger)'
      : data.slowness > 0.33
        ? 'var(--accent-strong)'
        : 'var(--flow-edge)';
  const label =
    data.metric === 'duration'
      ? data.meanDurationMs == null
        ? null
        : formatDurationMs(data.meanDurationMs)
      : String(data.frequency);
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className="dfg-edge-path"
        style={{
          stroke: data.highlighted ? 'var(--accent)' : colour,
          strokeWidth: 1.2 + data.weight * 5,
          opacity: data.dimmed ? 0.16 : 0.92,
        }}
        markerEnd="url(#dfg-arrow)"
      />
      {label ? (
        <EdgeLabelRenderer>
          <span
            className="flow-edge-label"
            style={{
              left: labelPoint.x,
              top: labelPoint.y,
              opacity: data.dimmed ? 0.3 : 1,
              pointerEvents: 'none',
            }}
          >
            {label}
          </span>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});

const READABLE_ZOOM = 0.72;
const nodeTypes = { activity: ActivityNode, terminal: TerminalNode };
const edgeTypes = { dfg: DfgEdgeView };

function DfgFlow({
  dfg,
  variant,
  metric,
  label,
}: Readonly<{
  dfg: DirectlyFollowsGraph;
  variant: TraceVariant | undefined;
  metric: DfgEdgeMetric;
  label: string;
}>) {
  const { fitView, getNodesBounds, setViewport } = useReactFlow();
  const store = useStoreApi();
  // Positions depend on the graph only; the variant just changes emphasis.
  const framing = useMemo(() => buildDfgFlow(dfg, undefined).nodes, [dfg]);
  const layout = useMemo(() => buildDfgFlow(dfg, variant), [dfg, variant]);
  const edges = useMemo(
    () =>
      layout.edges.map((edge) =>
        edge.data ? { ...edge, data: { ...edge.data, metric } } : edge,
      ),
    [layout.edges, metric],
  );

  // Fit small maps; large maps open at a readable zoom anchored on the start.
  useEffect(() => {
    let frame = 0;
    const frameMap = () => {
      const { width, height } = store.getState();
      if (!width || !height) {
        frame = window.requestAnimationFrame(frameMap);
        return;
      }
      const bounds = getNodesBounds(framing);
      const fitZoom = Math.min(
        width / Math.max(bounds.width + 64, 1),
        height / Math.max(bounds.height + 64, 1),
      );
      if (fitZoom >= READABLE_ZOOM) {
        void fitView({ padding: 0.08, maxZoom: 1.1, duration: 200 });
        return;
      }
      void setViewport(
        {
          x: width / 2 - (bounds.x + bounds.width / 2) * READABLE_ZOOM,
          y: 72 - bounds.y * READABLE_ZOOM,
          zoom: READABLE_ZOOM,
        },
        { duration: 200 },
      );
    };
    frame = window.requestAnimationFrame(frameMap);
    return () => window.cancelAnimationFrame(frame);
  }, [fitView, framing, getNodesBounds, setViewport, store]);

  return (
    <ReactFlow<DfgFlowNode, DfgFlowEdge>
      nodes={layout.nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      zoomOnDoubleClick={false}
      minZoom={0.1}
      maxZoom={2}
      aria-label={label}
      proOptions={{ hideAttribution: true }}
      className="!absolute inset-0"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1.25}
        color="var(--flow-grid)"
      />
    </ReactFlow>
  );
}

/** Read-only Directly-Follows Graph map with frequency/duration overlays. */
export function DfgCanvas(
  props: Readonly<{
    dfg: DirectlyFollowsGraph;
    variant: TraceVariant | undefined;
    metric: DfgEdgeMetric;
    label: string;
  }>,
) {
  return (
    <div className="flow-canvas relative h-full min-h-0 w-full">
      <svg className="flow-marker-defs" aria-hidden="true" focusable="false">
        <defs>
          <marker
            id="dfg-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="flow-marker-fill" />
          </marker>
        </defs>
      </svg>
      <ReactFlowProvider>
        <DfgFlow {...props} />
      </ReactFlowProvider>
    </div>
  );
}
