import { escapeCsvValue } from '@flowculus/file-formats';
import { MAX_EVENT_ROWS } from '@flowculus/process-mining';
import { readSheet } from 'read-excel-file/web-worker';

type Reply = { ok: true; source: string } | { ok: false; error: string };

const scope = globalThis as typeof globalThis & {
  onmessage: ((event: MessageEvent<ArrayBuffer>) => void) | null;
  postMessage: (message: Reply) => void;
};

scope.onmessage = async ({ data }) => {
  try {
    const rows = await readSheet(data, 1);
    if (rows.length < 2) throw new Error('xlsx-empty');
    if (rows.length - 1 > MAX_EVENT_ROWS) throw new Error('xlsx-too-many-events');
    const source = rows
      .map((row) =>
        row
          .map((value) =>
            escapeCsvValue(value instanceof Date ? value.toISOString() : (value ?? '')),
          )
          .join(','),
      )
      .join('\n');
    scope.postMessage({ ok: true, source });
  } catch (reason) {
    scope.postMessage({
      ok: false,
      error: reason instanceof Error ? reason.message : 'xlsx-invalid',
    });
  }
};

export {};
