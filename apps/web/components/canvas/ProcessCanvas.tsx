'use client';

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type EdgeChange,
  type NodeChange,
  type OnSelectionChangeParams,
  type Viewport,
} from '@xyflow/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from 'react';

import { unionRects } from '@flowculus/graph-layout';
import { insertEdgeWaypoint } from '@flowculus/file-formats';
import { getNodeBounds } from '@flowculus/process-model';

import { CanvasOverview } from '@/components/canvas/CanvasOverview';
import { CriticalChainLegend } from '@/components/canvas/CriticalChainLegend';
import {
  CanvasContextMenu,
  type CanvasMenuPosition,
} from '@/components/canvas/CanvasContextMenu';
import { FlowMarkers } from '@/components/canvas/FlowMarkers';
import { ImageReferenceLayer } from '@/components/canvas/ImageReferenceLayer';
import { ImageReferenceToolbar } from '@/components/canvas/ImageReferenceToolbar';
import { ProcessNodeView } from '@/components/canvas/ProcessNodeView';
import { SequenceFlowEdge } from '@/components/canvas/SequenceFlowEdge';
import {
  mergeMeasuredNodes,
  toFlowEdges,
  toFlowNodes,
  type ProcessFlowEdge,
  type ProcessFlowNode,
} from '@/lib/canvas-flow';
import { getWorkspaceCopy } from '@/lib/i18n';
import { addNodeAt, moveNodes, removeElements, replaceEdge } from '@/lib/model-editing';
import { SHAPE_DRAG_MIME, isSemanticShapeTool } from '@/lib/shape-tools';
import { useFocusRequest, useHistoryShortcuts } from '@/lib/use-canvas-shortcuts';
import { useCanvasClipboard } from '@/lib/use-canvas-clipboard';
import { useCanvasConnections } from '@/lib/use-canvas-connections';
import { useMediaQuery } from '@/lib/use-media-query';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';

const nodeTypes = { process: ProcessNodeView };
const edgeTypes = { flow: SequenceFlowEdge };
const FIT_VIEW_OPTIONS = { padding: 0.18, maxZoom: 1.25 };
const READABLE_ZOOM = 0.6;

const sameIds = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index]);

/**
 * The native BPMN canvas. The process model in the store is the source of
 * truth; React Flow keeps only transient drag/selection frames locally and the
 * model is committed once per gesture (drag stop, connect, delete, drop).
 */
export function ProcessCanvas() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const model = useWorkspaceStore((state) => state.processModel);
  const modelRevision = useWorkspaceStore((state) => state.modelRevision);
  const criticalChain = useWorkspaceStore((state) => state.analysisReport.criticalChain);
  const selectedNodeIds = useWorkspaceStore((state) => state.selectedNodeIds);
  const selectedEdgeId = useWorkspaceStore((state) => state.selectedEdgeId);
  const activeTool = useWorkspaceStore((state) => state.activeTool);
  const [initialViewport] = useState(() => useWorkspaceStore.getState().canvasViewport);
  const { screenToFlowPosition, fitView, setViewport } = useReactFlow<
    ProcessFlowNode,
    ProcessFlowEdge
  >();
  const coarsePointer = useMediaQuery('(pointer: coarse)');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const connections = useCanvasConnections(wrapperRef);
  const [contextMenu, setContextMenu] = useState<CanvasMenuPosition | null>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const openContextMenu = useCallback(
    (event: MouseEvent, selection: { nodeIds: string[]; edgeId: string | null }) => {
      event.preventDefault();
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      useWorkspaceStore.getState().setSelection(selection);
      setContextMenu({
        x: Math.max(4, Math.min(event.clientX - rect.left, rect.width - 216)),
        y: Math.max(4, Math.min(event.clientY - rect.top, rect.height - 390)),
      });
    },
    [],
  );
  // A restored viewport (returning from Mining) is kept as is; every other
  // mount and every new revision (imports, page switches, mined models) is
  // framed by the effect below.
  const fittedRevisionRef = useRef<number | null>(initialViewport ? modelRevision : null);

  // Quality is explained by the legend; analysis never changes the BPMN
  // boundary or sequence-flow line style.
  const criticalQuality =
    criticalChain?.status === 'ready'
      ? criticalChain.quality === 'exact'
        ? 'exact'
        : 'estimate'
      : undefined;
  const critical = useMemo(() => {
    const ready = criticalChain?.status === 'ready';
    return {
      nodes: new Set(ready ? criticalChain.nodeIds : []),
      edges: new Set(ready ? criticalChain.edgeIds : []),
    };
  }, [criticalChain]);
  const selectedSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
  const derivedNodes = useMemo(
    () => toFlowNodes(model, critical.nodes, selectedSet),
    [critical.nodes, model, selectedSet],
  );
  const derivedEdges = useMemo(
    () => toFlowEdges(model, critical.edges, selectedEdgeId, copy.edgeAccessibleName),
    [critical.edges, model, selectedEdgeId, copy.edgeAccessibleName],
  );

  // Store → React Flow synchronisation without effects (derived-state pattern).
  const [nodes, setNodes] = useState<ProcessFlowNode[]>(derivedNodes);
  const [edges, setEdges] = useState<ProcessFlowEdge[]>(derivedEdges);
  const [syncedNodes, setSyncedNodes] = useState(derivedNodes);
  const [syncedEdges, setSyncedEdges] = useState(derivedEdges);
  if (syncedNodes !== derivedNodes) {
    setSyncedNodes(derivedNodes);
    setNodes((current) => mergeMeasuredNodes(derivedNodes, current));
  }
  if (syncedEdges !== derivedEdges) {
    setSyncedEdges(derivedEdges);
    setEdges(derivedEdges);
  }

  // A newly loaded model is framed once. Long chains (mined logs) open at a
  // readable zoom anchored on the start instead of shrinking to a thin line.
  useEffect(() => {
    if (fittedRevisionRef.current === modelRevision) return;
    fittedRevisionRef.current = modelRevision;
    const frame = window.requestAnimationFrame(() => {
      const { width, height } = wrapperRef.current?.getBoundingClientRect() ?? {
        width: 0,
        height: 0,
      };
      const bounds = unionRects(
        Object.values(useWorkspaceStore.getState().processModel.nodes).map(getNodeBounds),
      );
      const fitZoom = bounds
        ? Math.min(width / (bounds.width + 160), height / (bounds.height + 160))
        : 1;
      if (!bounds || !width || fitZoom >= READABLE_ZOOM) {
        void fitView({ ...FIT_VIEW_OPTIONS, duration: 220 });
        return;
      }
      void setViewport(
        {
          x: 48 - bounds.x * READABLE_ZOOM,
          y: height / 2 - (bounds.y + bounds.height / 2) * READABLE_ZOOM,
          zoom: READABLE_ZOOM,
        },
        { duration: 220 },
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fitView, modelRevision, setViewport]);

  useHistoryShortcuts();
  useFocusRequest(wrapperRef);
  const clipboardStatus = useCanvasClipboard(wrapperRef);

  const onNodesChange = useCallback(
    (changes: NodeChange<ProcessFlowNode>[]) =>
      setNodes((current) => applyNodeChanges(changes, current)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<ProcessFlowEdge>[]) =>
      setEdges((current) => applyEdgeChanges(changes, current)),
    [],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
      const nodeIds = selectedNodes.map((node) => node.id).sort();
      const edgeId =
        selectedNodes.length === 0 && selectedEdges.length === 1
          ? selectedEdges[0].id
          : null;
      const state = useWorkspaceStore.getState();
      if (
        !sameIds([...state.selectedNodeIds].sort(), nodeIds) ||
        state.selectedEdgeId !== edgeId
      ) {
        state.setSelection({ nodeIds, edgeId });
      }
    },
    [],
  );

  const onNodeDragStop = useCallback(
    (_event: unknown, _node: ProcessFlowNode, dragged: ProcessFlowNode[]) => {
      const state = useWorkspaceStore.getState();
      state.commitModel(
        moveNodes(
          state.processModel,
          Object.fromEntries(dragged.map((node) => [node.id, node.position])),
        ),
      );
    },
    [],
  );

  const onEdgeDoubleClick = useCallback(
    (event: MouseEvent, flowEdge: ProcessFlowEdge) => {
      const state = useWorkspaceStore.getState();
      if (state.activeTool === 'hand') return;
      const edge = state.processModel.edges[flowEdge.id];
      if (!edge || (edge.routing?.waypoints.length ?? 0) >= 32) return;
      const source = state.processModel.nodes[edge.source];
      const target = state.processModel.nodes[edge.target];
      if (!source || !target) return;
      const from = getNodeBounds(source);
      const to = getNodeBounds(target);
      const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      state.commitModel(
        replaceEdge(state.processModel, {
          ...edge,
          routing: {
            ...edge.routing,
            style: edge.routing?.style ?? 'orthogonal',
            waypoints: insertEdgeWaypoint(
              edge.routing?.waypoints ?? [],
              point,
              { x: from.x + from.width / 2, y: from.y + from.height / 2 },
              { x: to.x + to.width / 2, y: to.y + to.height / 2 },
            ),
          },
        }),
      );
      state.setSelection({ nodeIds: [], edgeId: edge.id });
    },
    [screenToFlowPosition],
  );

  const onDelete = useCallback(
    ({
      nodes: removedNodes,
      edges: removedEdges,
    }: {
      nodes: ProcessFlowNode[];
      edges: ProcessFlowEdge[];
    }) => {
      const state = useWorkspaceStore.getState();
      state.commitModel(
        removeElements(
          state.processModel,
          removedNodes.map((node) => node.id),
          removedEdges.map((edge) => edge.id),
        ),
      );
    },
    [],
  );

  const onMoveEnd = useCallback((_event: unknown, viewport: Viewport) => {
    useWorkspaceStore.getState().setCanvasViewport(viewport);
  }, []);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes(SHAPE_DRAG_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const tool = event.dataTransfer.getData(SHAPE_DRAG_MIME);
    if (!isSemanticShapeTool(tool)) return;
    event.preventDefault();
    // Adding a shape returns to Select so the new element is immediately editable.
    useWorkspaceStore.getState().setActiveTool('select');
    // The node centre lands exactly under the pointer at any zoom or pan.
    const centre = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const state = useWorkspaceStore.getState();
    const result = addNodeAt(
      state.processModel,
      tool,
      copy.defaultNodeLabels[tool],
      centre,
    );
    state.commitModel(result.model);
    state.setSelection({ nodeIds: [result.nodeId], edgeId: null });
  };

  const isHand = activeTool === 'hand';
  const touchPan = coarsePointer || isHand;

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      className="flow-canvas relative min-h-0 flex-1"
      data-tool={activeTool}
      data-critical-quality={criticalQuality}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <FlowMarkers />
      <ReactFlow<ProcessFlowNode, ProcessFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        onNodeDragStop={onNodeDragStop}
        {...connections}
        onNodeContextMenu={(event, node) => {
          const selected = useWorkspaceStore.getState().selectedNodeIds;
          openContextMenu(event, {
            nodeIds: selected.includes(node.id) ? selected : [node.id],
            edgeId: null,
          });
        }}
        onEdgeContextMenu={(event, edge) =>
          openContextMenu(event, { nodeIds: [], edgeId: edge.id })
        }
        onEdgeDoubleClick={onEdgeDoubleClick}
        onDelete={onDelete}
        onMoveEnd={onMoveEnd}
        onPaneClick={() => {
          closeContextMenu();
          wrapperRef.current?.focus();
        }}
        defaultViewport={initialViewport ?? undefined}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={36}
        minZoom={0.15}
        maxZoom={2.5}
        nodesDraggable={!isHand}
        nodesConnectable={!isHand}
        edgesReconnectable={false}
        elementsSelectable={!isHand}
        selectionOnDrag={!touchPan}
        panOnDrag={touchPan ? true : [1, 2]}
        panOnScroll={!coarsePointer}
        zoomOnDoubleClick={false}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
        aria-label={copy.canvasLabel}
        proOptions={{ hideAttribution: true }}
        // Absolute fill: percentage heights collapse inside the mobile flex column.
        className="!absolute inset-0"
      >
        <ImageReferenceLayer />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.25}
          color="var(--flow-grid)"
        />
        <CanvasOverview />
      </ReactFlow>
      <ImageReferenceToolbar />
      {contextMenu ? (
        <CanvasContextMenu position={contextMenu} onClose={closeContextMenu} />
      ) : null}
      <CriticalChainLegend />
      {clipboardStatus ? (
        <div
          role="status"
          className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-[min(22rem,calc(100%-2rem))] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text)] shadow-[var(--shadow-soft)]"
        >
          {clipboardStatus}
        </div>
      ) : null}
    </div>
  );
}
