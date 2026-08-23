'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AnalysisDock } from '@/components/AnalysisDock';
import { AnalysisStatusBar } from '@/components/AnalysisStatusBar';
import { CanvasStage } from '@/components/CanvasStage';
import type { DrawioCanvasHandle } from '@/components/DrawioCanvas';
import { InspectorPanel } from '@/components/InspectorPanel';
import { MobileInspectorDialog } from '@/components/MobileInspectorDialog';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { WorkspaceRail } from '@/components/WorkspaceRail';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useWorkspaceStore } from '@/lib/workspace-store';
import type { SemanticShapeTool } from '@/lib/shape-tools';
import type { ProcessNode } from '@flowculus/process-model';
import { patchDrawioXmlForEdge, patchDrawioXmlForNode } from '@/lib/drawio-xml';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useLocalDraft } from '@/lib/use-local-draft';
import { useAnalysisWorker } from '@/lib/use-analysis-worker';
import { importProcessFiles } from '@/lib/import-process-file';
import { FileDropOverlay } from '@/components/FileDropOverlay';

export function FlowculusWorkspace() {
  const canvasRef = useRef<DrawioCanvasHandle | null>(null);
  const inspectorOpen = useWorkspaceStore((state) => state.inspectorOpen);
  const toggleInspector = useWorkspaceStore((state) => state.toggleInspector);
  const setProcessModel = useWorkspaceStore((state) => state.setProcessModel);
  const setCurrentXml = useWorkspaceStore((state) => state.setCurrentXml);
  const setModelName = useWorkspaceStore((state) => state.setModelName);
  const setAnalysisOptions = useWorkspaceStore((state) => state.setAnalysisOptions);
  const setDrawioStatus = useWorkspaceStore((state) => state.setDrawioStatus);
  const setSelectedNodeId = useWorkspaceStore((state) => state.setSelectedNodeId);
  const currentXml = useWorkspaceStore((state) => state.currentXml);
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const pendingInsertedNodeIdRef = useRef<string | null>(null);
  const [draggedShape, setDraggedShape] = useState<{
    tool: SemanticShapeTool;
    label: string;
  } | null>(null);

  useLocalDraft(canvasRef);
  useAnalysisWorker();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const handleInspectorOpenChange = (open: boolean) => {
    if (open !== inspectorOpen) toggleInspector();
  };
  const handleImportFiles = useCallback(
    async (files: File[]) => {
      const imported = await importProcessFiles(files, copy.modelName);
      setAnalysisOptions(imported.analysisOptions);
      if (imported.model) setProcessModel(imported.model);
      setCurrentXml(imported.xml);
      setModelName(imported.modelName);
      canvasRef.current?.load(imported.xml);
    },
    [copy.modelName, setAnalysisOptions, setCurrentXml, setModelName, setProcessModel],
  );

  const handleModelChange = useCallback(
    (model: Parameters<typeof setProcessModel>[0], xml: string) => {
      setProcessModel(model);
      setCurrentXml(xml);
      const pendingNodeId = pendingInsertedNodeIdRef.current;
      if (pendingNodeId && model.nodes[pendingNodeId]) {
        setSelectedNodeId(pendingNodeId);
        pendingInsertedNodeIdRef.current = null;
      }
    },
    [setCurrentXml, setProcessModel, setSelectedNodeId],
  );
  const handleInsertShape = useCallback(
    (tool: SemanticShapeTool, label: string) => {
      const insertedNodeId = canvasRef.current?.insertShape(tool, label);
      if (!insertedNodeId) return;
      pendingInsertedNodeIdRef.current = insertedNodeId;
      if (!inspectorOpen) toggleInspector();
    },
    [inspectorOpen, toggleInspector],
  );
  const handleDropShape = useCallback(
    (position: { x: number; y: number }) => {
      if (!draggedShape) return;
      const insertedNodeId = canvasRef.current?.insertShape(
        draggedShape.tool,
        draggedShape.label,
        position,
      );
      if (insertedNodeId) {
        pendingInsertedNodeIdRef.current = insertedNodeId;
        if (!inspectorOpen) toggleInspector();
      }
      setDraggedShape(null);
    },
    [draggedShape, inspectorOpen, toggleInspector],
  );
  const handleInspectorModelChange = useCallback(
    (node: ProcessNode) => {
      const model = useWorkspaceStore.getState().processModel;
      setProcessModel({ ...model, nodes: { ...model.nodes, [node.id]: node } });
      const xml = patchDrawioXmlForNode(
        currentXml || canvasRef.current?.getXml() || '',
        node,
      );
      if (xml) {
        setCurrentXml(xml);
        canvasRef.current?.load(xml);
      }
    },
    [currentXml, setCurrentXml, setProcessModel],
  );
  const handleInspectorEdgeChange = useCallback(
    (edgeId: string, probability: number | undefined) => {
      const model = useWorkspaceStore.getState().processModel;
      setProcessModel({
        ...model,
        edges: { ...model.edges, [edgeId]: { ...model.edges[edgeId], probability } },
      });
      const xml = patchDrawioXmlForEdge(
        currentXml || canvasRef.current?.getXml() || '',
        edgeId,
        probability,
      );
      if (xml) {
        setCurrentXml(xml);
        canvasRef.current?.load(xml);
      }
    },
    [currentXml, setCurrentXml, setProcessModel],
  );

  return (
    <TooltipProvider>
      <div className="flex min-h-[100dvh] max-h-[100dvh] flex-col overflow-hidden overscroll-none bg-[var(--canvas)]">
        <WorkspaceHeader canvasRef={canvasRef} onImportFiles={handleImportFiles} />
        <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
          <WorkspaceRail
            onInsertShape={handleInsertShape}
            onOpenNativeLibrary={() => canvasRef.current?.invokeAction('toggleShapes')}
            onDragShapeStart={(tool, label) => setDraggedShape({ tool, label })}
            onDragShapeEnd={() => {
              // Let the drop event run first; browsers dispatch dragend
              // immediately after drop and a synchronous clear can remove the
              // drop target before its handler receives the coordinates.
              window.setTimeout(() => setDraggedShape(null), 0);
            }}
          />
          <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
            <CanvasStage
              canvasRef={canvasRef}
              onModelChange={handleModelChange}
              onXmlChange={setCurrentXml}
              onStatusChange={setDrawioStatus}
              dropShape={draggedShape}
              onDropShape={handleDropShape}
              dropShapeLabel={copy.dropShape}
            />
            <AnalysisDock />
            <AnalysisStatusBar />
          </main>
          <InspectorPanel
            open={inspectorOpen}
            onModelChange={handleInspectorModelChange}
            onEdgeChange={handleInspectorEdgeChange}
          />
        </div>
        <div className="xl:hidden">
          <MobileInspectorDialog
            open={inspectorOpen}
            onOpenChange={handleInspectorOpenChange}
            onModelChange={handleInspectorModelChange}
            onEdgeChange={handleInspectorEdgeChange}
          />
        </div>
        <FileDropOverlay copy={copy} onImportFiles={handleImportFiles} />
      </div>
    </TooltipProvider>
  );
}
