'use client';

import { useState } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import {
  createEventLogTemplate,
  type EventLogTemplateKind,
} from '@flowculus/process-mining';
import { AppButton } from '@/components/ui/AppButton';
import { downloadTextFile } from '@/lib/browser-file-actions';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function MiningTemplateDownloads() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const [failed, setFailed] = useState(false);
  const download = (kind: EventLogTemplateKind) => {
    try {
      const template = createEventLogTemplate(kind);
      downloadTextFile(
        template.fileName,
        '\uFEFF' + template.csv,
        'text/csv;charset=utf-8',
      );
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };
  return (
    <details>
      <summary className="focus-ring cursor-pointer rounded text-xs font-medium text-[var(--muted-strong)]">
        {copy.miningImport.templates}
      </summary>
      <p className="my-2 text-xs leading-5 text-[var(--muted)]">
        {copy.miningImport.templateHint}
      </p>
      <div className="flex flex-col items-start gap-2">
        <AppButton type="button" onClick={() => download('events')}>
          <DownloadSimple size={14} aria-hidden="true" />
          {copy.miningImport.canonicalTemplate}
        </AppButton>
        <AppButton type="button" onClick={() => download('jira-status')}>
          <DownloadSimple size={14} aria-hidden="true" />
          {copy.miningImport.jiraTemplate}
        </AppButton>
      </div>
      {failed ? (
        <p role="alert" className="mt-2 text-xs text-[var(--danger)]">
          {copy.exportError}
        </p>
      ) : null}
    </details>
  );
}
