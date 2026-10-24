'use client';

import { ReactFlowProvider } from '@xyflow/react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect } from 'react';

import { AnalysisDock } from '@/components/AnalysisDock';
import { AnalysisStatusBar } from '@/components/AnalysisStatusBar';
import { CanvasFloatingControls } from '@/components/canvas/CanvasFloatingControls';
import { MinedModelNotice } from '@/components/canvas/MinedModelNotice';
import { ProcessCanvas } from '@/components/canvas/ProcessCanvas';
import { FileDropOverlay } from '@/components/FileDropOverlay';
import { InspectorPanel } from '@/components/InspectorPanel';
import { MobileInspectorDialog } from '@/components/MobileInspectorDialog';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { WorkspaceRail } from '@/components/WorkspaceRail';
import { SemanticGateDialog } from '@/components/semantics/SemanticGateDialog';
import { SectionErrorBoundary } from '@/components/ui/SectionErrorBoundary';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { getWorkspaceCopy } from '@/lib/i18n';
import { importWorkspaceFiles } from '@/lib/import-process-file';
import { useMiningStore } from '@/lib/mining-store';
import { useAnalysisWorker } from '@/lib/use-analysis-worker';
import { useLocalDraft } from '@/lib/use-local-draft';
import { useMediaQuery } from '@/lib/use-media-query';
import { useWorkspaceStore } from '@/lib/workspace-store';

// The mining view (worker, map and tables) is only loaded when it is opened.
const MiningWorkspace = dynamic(
  () =>
    import('@/components/mining/MiningWorkspace').then(
      (module) => module.MiningWorkspace,
    ),
  { ssr: false, loading: () => <MiningLoading /> },
);

function MiningLoading() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-0 flex-1 items-center justify-center bg-[var(--canvas)] text-sm text-[var(--muted)]"
    >
      <span
        className="mr-2 size-2 animate-pulse rounded-full bg-[var(--accent)]"
        aria-hidden="true"
      />
      {copy.miningLoading}
    </div>
  );
}

export function FlowculusWorkspace() {
  const mode = useWorkspaceStore((state) => state.mode);
  const inspectorOpen = useWorkspaceStore((state) => state.inspectorOpen);
  const setInspectorOpen = useWorkspaceStore((state) => state.setInspectorOpen);
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  // The bottom sheet is modal; it must not exist (and hide the page from
  // assistive technology) when the docked desktop inspector is visible.
  const dockedInspector = useMediaQuery('(min-width: 1280px)');

  useLocalDraft();
  useAnalysisWorker();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const handleImportFiles = useCallback(
    async (files: File[]) => {
      const imported = await importWorkspaceFiles(files, copy.modelName);
      const state = useWorkspaceStore.getState();
      if (imported.kind === 'event-log') {
        useMiningStore.getState().queueUpload({
          fileName: imported.fileName,
          source: imported.source,
        });
        state.setMode('mining');
        return;
      }
      state.loadModel(imported.model, {
        drawioSource: imported.drawioSource,
        analysisOptions: imported.analysisOptions,
        modelName: imported.modelName,
      });
      state.setMode('model');
    },
    [copy.modelName],
  );

  return (
    <TooltipProvider>
      <ReactFlowProvider>
        <div className="flex min-h-[100dvh] max-h-[100dvh] flex-col overflow-hidden overscroll-none bg-[var(--canvas)]">
          <WorkspaceHeader onImportFiles={handleImportFiles} />
          {mode === 'model' ? (
            <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
              <WorkspaceRail />
              <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
                <section
                  className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
                  aria-label={copy.canvasLabel}
                >
                  <SectionErrorBoundary section="canvas">
                    <ProcessCanvas />
                    <MinedModelNotice />
                    <CanvasFloatingControls />
                  </SectionErrorBoundary>
                </section>
                <SectionErrorBoundary section="analysis">
                  <AnalysisDock />
                </SectionErrorBoundary>
                <AnalysisStatusBar />
              </main>
              <SectionErrorBoundary section="inspector">
                <InspectorPanel open={inspectorOpen} />
              </SectionErrorBoundary>
            </div>
          ) : (
            <SectionErrorBoundary section="mining">
              <MiningWorkspace />
            </SectionErrorBoundary>
          )}
          {mode === 'model' && !dockedInspector ? (
            <MobileInspectorDialog open={inspectorOpen} onOpenChange={setInspectorOpen} />
          ) : null}
          <FileDropOverlay copy={copy} onImportFiles={handleImportFiles} />
          <SemanticGateDialog />
        </div>
      </ReactFlowProvider>
    </TooltipProvider>
  );
}
