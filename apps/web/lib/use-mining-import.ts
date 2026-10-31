'use client';

import { useEffect, useRef, useState } from 'react';
import {
  isCompleteMapping,
  type ColumnMapping,
  type EventImportSettings,
  type EventImportReview,
} from '@flowculus/process-mining';
import type { MiningRequest, MiningResponse, MiningTableResponse } from './mining-engine';
import { getWorkspaceCopy } from './i18n';
import type { Locale } from './i18n/types';

/** Owns only the pending import. No active log or BPMN document is mutated here. */
export function useMiningImport(
  initial: MiningTableResponse,
  source: string,
  request: (request: MiningRequest) => Promise<MiningResponse>,
  locale: Locale,
) {
  const [table, setTable] = useState(initial);
  const [settings, setSettings] = useState(initial.layout.settings);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>(initial.suggestion);
  const [review, setReview] = useState<EventImportReview | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const sequence = useRef(0);
  useEffect(
    () => () => {
      sequence.current += 1;
    },
    [],
  );

  const invalidate = () => {
    setReview(null);
    setAcknowledged(false);
    setErrorCode(null);
  };
  const updateMapping = (field: keyof ColumnMapping, value: string | undefined) => {
    invalidate();
    setMapping((current) => ({ ...current, [field]: value }));
  };
  const updateSettings = (patch: Partial<EventImportSettings>) => {
    invalidate();
    setSettings((current) => ({ ...current, ...patch }));
    if (patch.mode === 'jira-status')
      setMapping((current) => ({
        caseId: current.caseId,
        activity: current.activity,
        timestamp: current.timestamp,
      }));
  };
  const changeHeader = async (headerRow: number) => {
    invalidate();
    const ticket = ++sequence.current;
    setBusy(true);
    try {
      const response = await request({
        type: 'inspect-file',
        fileName: table.fileName,
        source,
        settings: { ...settings, headerRow },
      });
      if (ticket !== sequence.current) return;
      if (response.type !== 'table') throw new Error('unexpected-response');
      setTable(response);
      setSettings(response.layout.settings);
      setMapping(response.suggestion);
    } catch (reason) {
      if (ticket === sequence.current)
        setErrorCode(reason instanceof Error ? reason.message : '');
    } finally {
      if (ticket === sequence.current) setBusy(false);
    }
  };
  const inspect = async () => {
    if (!isCompleteMapping(mapping) || busy) return;
    const ticket = ++sequence.current;
    setBusy(true);
    setErrorCode(null);
    try {
      const response = await request({ type: 'review-import', mapping, settings });
      if (ticket !== sequence.current) return;
      if (response.type !== 'import-review') throw new Error('unexpected-response');
      setReview(response.review);
    } catch (reason) {
      if (ticket === sequence.current)
        setErrorCode(reason instanceof Error ? reason.message : '');
    } finally {
      if (ticket === sequence.current) setBusy(false);
    }
  };
  const copy = getWorkspaceCopy(locale).miningImport;
  return {
    table,
    settings,
    mapping,
    review,
    acknowledged,
    busy,
    error: errorCode === null ? null : (copy.errors[errorCode] ?? copy.error),
    updateMapping,
    updateSettings,
    changeHeader,
    inspect,
    setAcknowledged,
    edit: invalidate,
  };
}
