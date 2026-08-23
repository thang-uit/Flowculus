'use client';

import {
  FileArrowDown,
  FileArrowUp,
  PlayCircle,
  ShareNetwork,
  SidebarSimple,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import Link from 'next/link';
import type { DrawioCanvasHandle } from '@/components/DrawioCanvas';
import {
  serializeFlowculusFile,
  processModelToEdgesCsv,
  processModelToNodesCsv,
} from '@flowculus/file-formats';

import { FlowculusLogo } from '@/components/branding/FlowculusLogo';
import { ImageReferencePanel } from '@/components/ImageReferencePanel';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  WorkspaceExportMenu,
  type WorkspaceExportFormat,
} from '@/components/WorkspaceExportMenu';
import { WorkspaceCanvasControls } from '@/components/WorkspaceToolbar';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';
import {
  downloadDataUriFile,
  downloadJpegFromImageDataUri,
  downloadTextFile,
} from '@/lib/browser-file-actions';
import { getWorkspaceCopy } from '@/lib/i18n';
import { downloadAnalysisReportImage } from '@/lib/report-image';
import { printAnalysisReport } from '@/lib/print-report';
import { safeFileStem } from '@/lib/file-name';
import { useWorkspaceStore } from '@/lib/workspace-store';

interface WorkspaceHeaderProps {
  canvasRef: RefObject<DrawioCanvasHandle | null>;
  onImportFiles: (files: File[]) => Promise<void>;
}

export function WorkspaceHeader({ canvasRef, onImportFiles }: WorkspaceHeaderProps) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const model = useWorkspaceStore((state) => state.processModel);
  const currentXml = useWorkspaceStore((state) => state.currentXml);
  const report = useWorkspaceStore((state) => state.analysisReport);
  const analysisOptions = useWorkspaceStore((state) => state.analysisOptions);
  const analysisRuntimeStatus = useWorkspaceStore((state) => state.analysisRuntimeStatus);
  const inspectorOpen = useWorkspaceStore((state) => state.inspectorOpen);
  const toggleInspector = useWorkspaceStore((state) => state.toggleInspector);
  const isAnalyzing = analysisRuntimeStatus === 'calculating';
  const [, setStatusMessage] = useState(copy.localDraft);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusTimerRef = useRef<number | null>(null);
  const exportFileStem = safeFileStem(model.name, 'process');

  useEffect(
    () => () => {
      if (statusTimerRef.current != null) window.clearTimeout(statusTimerRef.current);
    },
    [],
  );

  const showStatus = (message: string) => {
    setStatusMessage(message);
    if (statusTimerRef.current != null) window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(
      () => setStatusMessage(copy.localDraft),
      2400,
    );
  };

  const getNativeXml = () => canvasRef.current?.getXml() || currentXml || '';

  const downloadXml = () => {
    const nativeXml = getNativeXml();
    if (!nativeXml) return showStatus(copy.fileError);
    downloadTextFile(`${exportFileStem}.drawio`, nativeXml, 'application/xml');
    showStatus(copy.saved);
  };

  const downloadFlowculus = () => {
    downloadTextFile(
      `${exportFileStem}.flowculus.json`,
      serializeFlowculusFile({
        schemaVersion: 1,
        model,
        drawioXml: getNativeXml(),
        analysisOptions,
        analysis: {
          cycleTimeMinutes: report.cycleTimeMinutes,
          theoreticalCycleTimeMinutes: report.theoreticalCycleTimeMinutes,
          cycleTimeEfficiency: report.cycleTimeEfficiency,
          costPerExecution: report.costPerExecution,
          littleLaw: report.littleLaw,
          queue: report.queue,
          criticalPath: report.criticalPath,
          pathCount: report.pathCount,
        },
      }),
      'application/json',
    );
    showStatus(copy.localCopyExported);
  };

  const downloadCsv = () => {
    downloadTextFile(
      `${exportFileStem}.nodes.csv`,
      processModelToNodesCsv(model),
      'text/csv',
    );
    downloadTextFile(
      `${exportFileStem}.edges.csv`,
      processModelToEdgesCsv(model),
      'text/csv',
    );
    showStatus(copy.localCopyExported);
  };

  const exportCanvas = async (format: WorkspaceExportFormat) => {
    const reportWindow = format === 'pdf' ? window.open('', '_blank') : null;
    try {
      const protocolFormat = format === 'jpeg' ? 'jpg' : format;
      const result = await canvasRef.current?.export(protocolFormat);
      if (!result) {
        reportWindow?.close();
        return showStatus(copy.fileError);
      }
      if (protocolFormat === 'xml') {
        downloadTextFile(
          `${exportFileStem}.drawio`,
          typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          'application/xml',
        );
      } else if (protocolFormat === 'json') {
        downloadTextFile(
          `${exportFileStem}.drawio.json`,
          typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          'application/json',
        );
      } else if (format === 'jpg' || format === 'jpeg') {
        await downloadJpegFromImageDataUri(
          `${exportFileStem}.${format}`,
          result as string,
        );
      } else if (format === 'pdf') {
        const currency = Object.values(model.nodes).find((node) => node.cost?.currency)
          ?.cost?.currency;
        printAnalysisReport({
          imageDataUri: result as string,
          title: model.name || copy.modelName,
          report,
          copy,
          locale,
          currency,
          targetWindow: reportWindow,
        });
      } else {
        downloadDataUriFile(`${exportFileStem}.${format}`, result as string);
      }
    } catch {
      reportWindow?.close();
      showStatus(copy.fileError);
      return;
    }
    showStatus(copy.localCopyExported);
  };

  const exportAnalysisImage = async (format: 'png' | 'jpeg') => {
    try {
      const protocolFormat = format === 'jpeg' ? 'jpg' : format;
      const result = await canvasRef.current?.export(protocolFormat);
      if (!result || typeof result !== 'string') return showStatus(copy.fileError);
      await downloadAnalysisReportImage({
        imageDataUri: result,
        filename: `${exportFileStem}.${format}`,
        format,
        title: model.name || copy.modelName,
        report,
        copy,
        locale,
        currency: Object.values(model.nodes).find((node) => node.cost?.currency)?.cost
          ?.currency,
      });
      showStatus(copy.localCopyExported);
    } catch {
      showStatus(copy.fileError);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void onImportFiles(files)
      .then(() => showStatus(copy.fileReady))
      .catch((error: unknown) => {
        if (error instanceof Error && error.message === 'file-too-large') {
          showStatus(copy.fileTooLarge);
          return;
        }
        showStatus(copy.fileError);
      });
  };

  const handleShare = async () => {
    try {
      if (navigator.share)
        await navigator.share({ title: model.name, text: copy.shareText });
      else await navigator.clipboard.writeText(window.location.href);
      showStatus(copy.shareSheetOpened);
    } catch {
      showStatus(copy.shareCancelled);
    }
  };

  const handleAnalyze = () => {
    if (isAnalyzing) return;
    showStatus(copy.preparingAnalysis);
    canvasRef.current?.refresh();
  };

  return (
    <header className="workspace-header flex h-12 min-h-12 min-w-0 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3 sm:px-4">
      {/* ═══════════════════════ MOBILE VIEW ═══════════════════════ */}
      <div className="flex w-full items-center justify-between gap-2 lg:hidden">
        <Tooltip content={copy.brandTooltip}>
          <Link
            href="/"
            aria-label={copy.brandTooltip}
            title={copy.brandTooltip}
            className="focus-ring group min-w-0 cursor-pointer select-none rounded-xl"
          >
            <FlowculusLogo compact className="shrink-0" />
          </Link>
        </Tooltip>

        <div className="flex items-center gap-1">
          <Tooltip content={isAnalyzing ? copy.analyzing : copy.analyze}>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              aria-label={isAnalyzing ? copy.analyzing : copy.analyze}
              title={isAnalyzing ? copy.analyzing : copy.analyze}
              className="focus-ring tb-btn bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <PlayCircle size={17} weight="fill" aria-hidden="true" />
            </button>
          </Tooltip>
          <LanguageToggle />
          <ThemeToggle />
          <WorkspaceExportMenu
            copy={copy}
            compact
            onOpenFile={() => fileInputRef.current?.click()}
            onSaveFile={downloadXml}
            onExportCanvas={(format) => void exportCanvas(format)}
            onExportAnalysisImage={(format) => void exportAnalysisImage(format)}
            onDownloadFlowculus={downloadFlowculus}
            onDownloadCsv={downloadCsv}
          />
        </div>
      </div>

      {/* ═══════════════════════ DESKTOP VIEW ══════════════════════ */}
      <div className="hidden w-full items-center justify-between gap-3 lg:flex">
        {/* Left cluster: Logo + Divider + Canvas Tools */}
        <div className="flex min-w-0 items-center gap-2.5">
          <Tooltip content={copy.brandTooltip}>
            <Link
              href="/"
              aria-label={copy.brandTooltip}
              title={copy.brandTooltip}
              className="focus-ring group min-w-0 cursor-pointer select-none rounded-xl"
            >
              <FlowculusLogo className="shrink-0" />
            </Link>
          </Tooltip>

          <span className="tb-divider" aria-hidden="true" />

          {/* Canvas Tools */}
          <WorkspaceCanvasControls canvasRef={canvasRef} />
        </div>

        {/* Right cluster: File Ops | Export | Analyze | Language & Theme | Inspector */}
        <div className="flex shrink-0 items-center gap-1">
          {/* File Actions */}
          <Tooltip content={copy.importHint}>
            <button
              type="button"
              aria-label={copy.openFile}
              title={copy.openFile}
              onClick={() => fileInputRef.current?.click()}
              className="focus-ring tb-btn tb-btn--idle"
            >
              <FileArrowUp size={15} aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content={copy.saveFile}>
            <button
              type="button"
              aria-label={copy.saveFile}
              title={copy.saveFile}
              onClick={downloadXml}
              className="focus-ring tb-btn tb-btn--idle"
            >
              <FileArrowDown size={15} aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content={copy.shareFile}>
            <button
              type="button"
              aria-label={copy.shareFile}
              title={copy.shareFile}
              onClick={handleShare}
              className="focus-ring tb-btn tb-btn--idle"
            >
              <ShareNetwork size={15} aria-hidden="true" />
            </button>
          </Tooltip>
          <ImageReferencePanel />

          <span className="tb-divider" aria-hidden="true" />

          {/* Export dropdown */}
          <WorkspaceExportMenu
            copy={copy}
            onOpenFile={() => fileInputRef.current?.click()}
            onSaveFile={downloadXml}
            onExportCanvas={(format) => void exportCanvas(format)}
            onExportAnalysisImage={(format) => void exportAnalysisImage(format)}
            onDownloadFlowculus={downloadFlowculus}
            onDownloadCsv={downloadCsv}
          />

          {/* Analyze Primary CTA */}
          <Tooltip content={isAnalyzing ? copy.analyzing : copy.analyze}>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              aria-label={isAnalyzing ? copy.analyzing : copy.analyze}
              title={isAnalyzing ? copy.analyzing : copy.analyze}
              className="focus-ring flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent-ink)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <PlayCircle size={16} weight="fill" aria-hidden="true" />
              <span>{isAnalyzing ? copy.analyzing : copy.analyze}</span>
            </button>
          </Tooltip>

          <span className="tb-divider" aria-hidden="true" />

          {/* Language & Theme */}
          <LanguageToggle />
          <ThemeToggle />

          <span className="tb-divider" aria-hidden="true" />

          {/* Inspector Panel Toggle */}
          <Tooltip content={copy.toggleInspector}>
            <button
              type="button"
              aria-label={copy.toggleInspector}
              title={copy.toggleInspector}
              aria-pressed={inspectorOpen}
              onClick={toggleInspector}
              className={cn(
                'focus-ring tb-btn',
                inspectorOpen ? 'tb-btn--active' : 'tb-btn--idle',
              )}
            >
              <SidebarSimple
                size={15}
                weight={inspectorOpen ? 'bold' : 'regular'}
                aria-hidden="true"
              />
            </button>
          </Tooltip>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".flowculus.json,.drawio,.xml,.json,.csv"
        multiple
        className="sr-only"
        aria-label={copy.openFile}
        onChange={(event) => void handleFileChange(event)}
      />
    </header>
  );
}
