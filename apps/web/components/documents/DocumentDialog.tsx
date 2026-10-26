'use client';

import { AppButton } from '@/components/ui/AppButton';

import { useId, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AppCheckbox } from '@/components/ui/AppCheckbox';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { getWorkspaceCopy } from '@/lib/i18n';
import { getDocumentCopy, type DocumentCopy } from '@/lib/i18n/document-copy';
import {
  getWorkspaceDocuments,
  isDocumentDirty,
  isValidDocumentName,
  normalizeDocumentName,
  type WorkspaceDocument,
} from '@/lib/documents/document-types';
import {
  deviceFileName,
  hasDeviceFile,
  isDeviceAutoSave,
  isValidDeviceFileName,
  saveDocumentToDevice,
  supportsDeviceFiles,
} from '@/lib/documents/device-file';
import { DocumentModal } from './DocumentModal';

export function DocumentDialog() {
  const dialog = useWorkspaceStore((state) => state.documentDialog);
  const locale = usePreferencesStore((state) => state.locale);
  const document = useWorkspaceStore(
    useShallow((state) => {
      const item = state.documents.find((entry) => entry.id === dialog?.id);
      return item && item.id === state.activeDocumentId
        ? {
            ...item,
            processModel: state.processModel,
            analysisOptions: state.analysisOptions,
            drawioSource: state.drawioSource,
          }
        : item;
    }),
  );
  if (!dialog || !document) return null;
  return (
    <DocumentForm
      key={`${dialog.kind}:${dialog.id}`}
      document={document}
      kind={dialog.kind}
      copy={getDocumentCopy(locale)}
      fallbackName={getWorkspaceCopy(locale).modelName}
    />
  );
}

function DocumentForm({
  document,
  kind,
  copy,
  fallbackName,
}: Readonly<{
  document: WorkspaceDocument;
  kind: 'rename' | 'save' | 'close';
  copy: DocumentCopy;
  fallbackName: string;
}>) {
  const [name, setName] = useState(document.processModel.name);
  const [filename, setFilename] = useState(deviceFileName(document.processModel.name));
  const [fileNameEdited, setFileNameEdited] = useState(false);
  const [automatic, setAutomatic] = useState(() =>
    hasDeviceFile(document.id) ? isDeviceAutoSave(document.id) : true,
  );
  const [busy, setBusy] = useState(false);
  const [closeAfterSave, setCloseAfterSave] = useState(kind === 'close');
  const [saving, setSaving] = useState(kind === 'save');
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const fileId = useId();
  const autoId = useId();
  const cancel = () => {
    if (!busy) useWorkspaceStore.getState().setDocumentDialog(null);
  };
  const closeDocument = () => {
    const state = useWorkspaceStore.getState();
    const current = state.documents.find((item) => item.id === document.id);
    if (!current || current.deviceStatus === 'saving') return;
    state.setDocumentDialog(null);
    state.closeDocument(document.id, fallbackName);
  };
  const rename = () => {
    const normalized = normalizeDocumentName(name);
    if (!isValidDocumentName(normalized)) {
      setError(copy.invalidName);
      return false;
    }
    return useWorkspaceStore.getState().renameDocument(document.id, normalized);
  };
  const submit = async () => {
    if (!isValidDocumentName(normalizeDocumentName(name))) {
      setError(copy.invalidName);
      return;
    }
    if (saving && !isValidDeviceFileName(filename)) {
      setError(copy.fileNameInvalid);
      return;
    }
    if (!rename()) return;
    if (!saving) {
      cancel();
      return;
    }
    setBusy(true);
    setError(null);
    const result = await saveDocumentToDevice(document.id, {
      saveAs: true,
      fileName: deviceFileName(filename),
      autoSave: automatic,
    });
    setBusy(false);
    if (result === 'saved') {
      const current = getWorkspaceDocuments(useWorkspaceStore.getState()).find(
        (item) => item.id === document.id,
      );
      if (closeAfterSave && current && !isDocumentDirty(current)) closeDocument();
      else cancel();
    } else if (result === 'blocked') cancel();
    else if (result === 'error') setError(copy.error);
  };
  const closing = kind === 'close' && !saving;
  const needsSave = isDocumentDirty(document);
  const writing = document.deviceStatus === 'saving';
  return (
    <DocumentModal
      title={
        closing
          ? needsSave
            ? copy.closeTitle
            : copy.closeSavedTitle
          : saving
            ? copy.saveTitle
            : copy.rename
      }
      description={
        closing
          ? `${needsSave ? copy.closeHint : copy.closeSavedHint}${document.hasReferenceImage ? ` ${copy.photoCloseHint}` : ''}`
          : saving
            ? copy.saveHint
            : copy.nameHint
      }
      closeLabel={copy.cancel}
      onClose={cancel}
      busy={busy}
    >
      {closing ? (
        <div className="mt-5">
          <p className="break-words text-sm font-semibold">
            {document.processModel.name}
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <AppButton type="button" variant="ghost" size="sm" onClick={cancel}>
              {copy.cancel}
            </AppButton>
            <AppButton
              type="button"
              variant="danger"
              size="sm"
              disabled={writing}
              onClick={closeDocument}
            >
              {needsSave ? copy.discard : copy.closeSaved}
            </AppButton>
            {needsSave ? (
              <AppButton
                type="button"
                variant="primary"
                size="sm"
                disabled={writing}
                onClick={() => {
                  setSaving(true);
                  setCloseAfterSave(true);
                }}
              >
                {copy.saveAndClose}
              </AppButton>
            ) : null}
          </div>
        </div>
      ) : (
        <form
          noValidate
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) void submit();
          }}
        >
          <div>
            <label htmlFor={nameId} className="mb-1.5 block text-xs font-medium">
              {copy.name}
            </label>
            <input
              id={nameId}
              autoFocus
              required
              value={name}
              maxLength={120}
              disabled={busy}
              aria-invalid={error === copy.invalidName || undefined}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
                if (!fileNameEdited) setFilename(deviceFileName(event.target.value));
              }}
              className="focus-ring w-full rounded-lg border border-[var(--border-strong)] bg-[var(--canvas)] px-3 py-2.5 text-sm"
            />
          </div>
          {saving ? (
            <>
              <div>
                <label htmlFor={fileId} className="mb-1.5 block text-xs font-medium">
                  {copy.fileName}
                </label>
                <input
                  id={fileId}
                  required
                  value={filename}
                  maxLength={134}
                  disabled={busy}
                  aria-invalid={error === copy.fileNameInvalid || undefined}
                  onChange={(event) => {
                    setFilename(event.target.value);
                    setFileNameEdited(true);
                    setError(null);
                  }}
                  className="focus-ring w-full rounded-lg border border-[var(--border-strong)] bg-[var(--canvas)] px-3 py-2.5 text-sm"
                />
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs leading-5">
                <dt className="text-[var(--muted)]">{copy.format}</dt>
                <dd>{copy.formatValue}</dd>
                <dt className="text-[var(--muted)]">{copy.location}</dt>
                <dd>{copy.device}</dd>
              </dl>
              {supportsDeviceFiles() ? (
                <div>
                  <label
                    htmlFor={autoId}
                    className="flex min-h-8 cursor-pointer items-center gap-2.5 text-xs font-medium"
                  >
                    <AppCheckbox
                      id={autoId}
                      checked={automatic}
                      disabled={busy}
                      onChange={(event) => setAutomatic(event.target.checked)}
                    />
                    {copy.autoSave}
                  </label>
                  <p className="mt-1.5 text-xs leading-5 text-[var(--muted-strong)]">
                    {copy.autoHint}
                  </p>
                </div>
              ) : (
                <p className="text-xs leading-5 text-[var(--muted-strong)]">
                  {copy.downloadHint}
                </p>
              )}
            </>
          ) : null}
          {error ? (
            <p role="alert" className="text-xs leading-5 text-[var(--danger)]">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <AppButton
              type="button"
              disabled={busy}
              variant="ghost"
              size="sm"
              onClick={cancel}
            >
              {copy.cancel}
            </AppButton>
            <AppButton type="submit" disabled={busy} variant="primary" size="sm">
              {busy ? copy.saving : saving ? copy.save : copy.confirm}
            </AppButton>
          </div>
        </form>
      )}
    </DocumentModal>
  );
}
