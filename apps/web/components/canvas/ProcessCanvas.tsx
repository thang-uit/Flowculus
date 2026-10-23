'use client';

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnSelectionChangeParams,
  type Viewport,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';

import { unionRects } from '@flowculus/graph-layout';
import { getNodeBounds } from '@flowculus/process-model';

import { ProcessNodeView } from '@/components/canvas/ProcessNodeView';
import { SequenceFlowEdge } from '@/components/canvas/SequenceFlowEdge';
import {
  FLOW_MARKER_IDS,
  mergeMeasuredNodes,
  toFlowEdges,
  toFlowNodes,
  type ProcessFlowEdge,
  type ProcessFlowNode,
} from '@/lib/canvas-flow';
import { getWorkspaceCopy } from '@/lib/i18n';
import { addNodeAt, connectNodes, moveNodes, removeElements } from '@/lib/model-editing';
import { SHAPE_DRAG_MIME, isSemanticShapeTool } from '@/lib/shape-tools';
import { useMediaQuery } from '@/lib/use-media-query';
import { useWorkspaceStore } from '@/lib/workspace-store';

const nodeTypes = { process: ProcessNodeView };
const edgeTypes = { flow: SequenceFlowEdge };
const FIT_VIEW_OPTIONS = { padding: 0.18, maxZoom: 1.25 };
const READABLE_ZOOM = 0.6;

const sameIds = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index]);

const isEditableTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

function FlowMarkers() {
  return (
    <svg className="flow-marker-defs" aria-hidden="true" focusable="false">
      <defs>
        <marker
          id={FLOW_MARKER_IDS.default}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="flow-marker-fill" />
        </marker>
        <marker
          id={FLOW_MARKER_IDS.critical}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            className="flow-marker-fill flow-marker-fill--critical"
          />
        </marker>
        <marker
          id={FLOW_MARKER_IDS.open}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="9"
          markerHeight="9"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10" className="flow-marker-stroke" />
        </marker>
      </defs>
    </svg>
  );
}

/**
 * The native BPMN canvas. The process model in the store is the source of
 * truth; React Flow keeps only transient drag/selection frames locally and the
 * model is committed once per gesture (drag stop, connect, delete, drop).
 */
export function ProcessCanvas() {
  const locale = useWorkspaceStore((state) => state.locale);
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
  // A restored viewport (returning from Mining) is kept as is; every other
  // mount and every new revision (imports, page switches, mined models) is
  // framed by the effect below.
  const fittedRevisionRef = useRef<number | null>(initialViewport ? modelRevision : null);

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
    () => toFlowEdges(model, critical.edges, selectedEdgeId),
    [critical.edges, model, selectedEdgeId],
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;
      const key = event.key.toLowerCase();
      const state = useWorkspaceStore.getState();
      if (state.mode !== 'model') return;
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        state.undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        state.redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const onConnect = useCallback((connection: Connection) => {
    const state = useWorkspaceStore.getState();
    const result = connectNodes(state.processModel, connection.source, connection.target);
    if (result) state.commitModel(result.model);
  }, []);

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
      className="flow-canvas relative min-h-0 flex-1"
      data-tool={activeTool}
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
        onConnect={onConnect}
        onConnectStart={() => wrapperRef.current?.setAttribute('data-connecting', 'true')}
        onConnectEnd={() => wrapperRef.current?.removeAttribute('data-connecting')}
        onDelete={onDelete}
        onMoveEnd={onMoveEnd}
        defaultViewport={initialViewport ?? undefined}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={36}
        minZoom={0.15}
        maxZoom={2.5}
        nodesDraggable={!isHand}
        nodesConnectable={!isHand}
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
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.25}
          color="var(--flow-grid)"
        />
        <MiniMap
          pannable
          zoomable
          ariaLabel={copy.minimap}
          nodeBorderRadius={6}
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
}
