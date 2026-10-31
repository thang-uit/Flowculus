'use client';
import { useRef, useState } from 'react';
import { DownloadSimple, FileCode, FilePdf, FileText } from '@phosphor-icons/react';
import { AppMenu } from '@/components/ui/AppMenu';
import { getMiningEvidenceCopy } from '@/lib/i18n/mining-evidence-copy';
import { getMiningDocumentCopy } from '@/lib/i18n/mining-report-document-copy';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useMiningStore } from '@/lib/mining-store';
import { useCurrentMiningReference } from '@/lib/use-current-mining-reference';
import { downloadTextFile } from '@/lib/browser-file-actions';
import { exportFileName } from '@/lib/file-name';
import { useMiningDuration } from '@/lib/use-mining-duration';
import {
  downloadMiningReportHtml,
  printMiningReport,
} from '@/lib/mining-report-document-actions';
import { buildMiningEvidenceReport } from '@/lib/mining-evidence-report';
import { showNotice } from '@/lib/ui/notice-store';

/** Report actions use the same current-reference guard as the on-screen findings. */
export function MiningEvidenceExport() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getMiningEvidenceCopy(locale);
  const documentCopy = getMiningDocumentCopy(locale);
  const duration = useMiningDuration();
  const discovery = useMiningStore((state) => state.result);
  const replay = useMiningStore((state) => state.replay);
  const status = useMiningStore((state) => state.status);
  const mappingTable = useMiningStore((state) => state.mappingTable);
  const current = useCurrentMiningReference();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  if (!discovery) return null;
  const options = {
    result: discovery,
    locale,
    duration,
    source: replay?.kind === 'file' ? replay.fileName : documentCopy.sample,
    reference: current
      ? { name: current.model.name, alignment: current.evidence.alignment }
      : null,
  };
  const run = async (format: 'html' | 'pdf' | 'json') => {
    if (running.current || status !== 'ready' || mappingTable) return;
    running.current = true;
    setBusy(true);
    try {
      if (format === 'html') await downloadMiningReportHtml(options);
      else if (format === 'pdf') await printMiningReport(options);
      else
        downloadTextFile(
          exportFileName(discovery.logName, 'analysis', 'json'),
          JSON.stringify(buildMiningEvidenceReport(discovery, current), null, 2),
          'application/json',
        );
    } catch (reason) {
      showNotice(
        reason instanceof Error && reason.message === 'report-too-large'
          ? documentCopy.tooLarge
          : reason instanceof Error && reason.message === 'report-popup-blocked'
            ? documentCopy.popup
            : copy.exportFailed,
        'error',
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const disabled = busy || status !== 'ready' || !!mappingTable;
  return (
    <div className="space-y-3 border-t border-[var(--border)] p-4">
      <dl className="grid grid-cols-[1fr_auto] gap-1 text-xs">
        <dt className="col-span-2 font-semibold">{copy.dataQuality}</dt>
        <dt>{copy.skipped}</dt>
        <dd>{discovery.skippedRows}</dd>
        <dt>{copy.invalidTime}</dt>
        <dd>{discovery.invalidTimestamps}</dd>
        <dt>{copy.invalidStart}</dt>
        <dd>{discovery.invalidStartTimes}</dd>
      </dl>
      <AppMenu
        label={documentCopy.export}
        trigger={
          <>
            <DownloadSimple size={15} aria-hidden="true" />
            {busy ? documentCopy.exporting : documentCopy.export}
          </>
        }
        triggerClassName="app-button app-button--secondary w-full"
        sections={[
          {
            id: 'readable',
            actions: [
              {
                id: 'html',
                label: documentCopy.html,
                icon: FileText,
                disabled,
                onSelect: () => void run('html'),
              },
              {
                id: 'pdf',
                label: documentCopy.pdf,
                icon: FilePdf,
                disabled,
                onSelect: () => void run('pdf'),
              },
            ],
          },
          {
            id: 'evidence',
            actions: [
              {
                id: 'json',
                label: documentCopy.json,
                icon: FileCode,
                disabled,
                onSelect: () => void run('json'),
              },
            ],
          },
        ]}
      />
    </div>
  );
}
