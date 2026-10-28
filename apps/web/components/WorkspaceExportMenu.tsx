'use client';

import {
  FileArrowDown,
  FileCode,
  FileImage,
  FilePdf,
  ShareNetwork,
  Table,
} from '@phosphor-icons/react';
import { getCollaborationCopy } from '@/lib/i18n/collaboration-copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { AppMenu } from '@/components/ui/AppMenu';
import type { WorkspaceCopy } from '@/lib/i18n';
import type { WorkspaceExportFormat } from '@/lib/workspace-exports';
import { cn } from '@/lib/cn';

export function WorkspaceExportMenu({
  copy,
  onExport,
  onShare,
  className,
  compact = false,
}: Readonly<{
  copy: WorkspaceCopy;
  onExport: (format: WorkspaceExportFormat) => void;
  onShare: () => void;
  className?: string;
  compact?: boolean;
}>) {
  const words = getCollaborationCopy(usePreferencesStore((state) => state.locale));
  return (
    <span className={className}>
      <AppMenu
        label={copy.exportFile}
        triggerClassName={cn(
          'tb-btn tb-btn--idle h-8 px-2.5 text-xs font-medium',
          compact && 'px-1.5',
        )}
        trigger={
          <>
            <FileArrowDown size={15} aria-hidden="true" />
            {!compact ? (
              <span className="hidden sm:inline">{copy.exportFile}</span>
            ) : null}
          </>
        }
        sections={[
          {
            id: 'file',
            label: copy.exportSectionFile,
            actions: [
              {
                id: 'share',
                label: copy.shareFile,
                icon: ShareNetwork,
                onSelect: onShare,
              },
            ],
          },
          {
            id: 'diagram',
            label: copy.exportSectionDiagram,
            actions: [
              {
                id: 'bpmn',
                label: words.bpmn,
                icon: FileCode,
                onSelect: () => onExport('bpmn'),
              },
              {
                id: 'drawio',
                label: copy.exportDrawio,
                icon: FileCode,
                onSelect: () => onExport('drawio'),
              },
              {
                id: 'svg',
                label: copy.exportSvg,
                icon: FileImage,
                onSelect: () => onExport('svg'),
              },
              {
                id: 'png',
                label: copy.exportPng,
                icon: FileImage,
                onSelect: () => onExport('png'),
              },
              {
                id: 'jpeg',
                label: copy.exportJpeg,
                icon: FileImage,
                onSelect: () => onExport('jpeg'),
              },
            ],
          },
          {
            id: 'report',
            label: copy.exportSectionReport,
            actions: [
              {
                id: 'pdf',
                label: copy.exportPdf,
                icon: FilePdf,
                onSelect: () => onExport('pdf'),
              },
              {
                id: 'report-png',
                label: copy.exportPngReport,
                icon: FileImage,
                onSelect: () => onExport('report-png'),
              },
              {
                id: 'report-jpeg',
                label: copy.exportJpegReport,
                icon: FileImage,
                onSelect: () => onExport('report-jpeg'),
              },
            ],
          },
          {
            id: 'data',
            label: copy.exportSectionData,
            actions: [
              {
                id: 'flowculus',
                label: copy.exportFlowculus,
                icon: FileCode,
                onSelect: () => onExport('flowculus'),
              },
              {
                id: 'csv',
                label: copy.exportCsv,
                icon: Table,
                onSelect: () => onExport('csv'),
              },
            ],
          },
        ]}
      />
    </span>
  );
}
