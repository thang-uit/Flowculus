export const MAX_XLSX_BYTES = 10 * 1024 * 1024;
export const MAX_LOG_FILE_BYTES = 50 * 1024 * 1024;
const XLSX_TIMEOUT_MS = 45_000;

type XlsxReply = { ok: true; source: string } | { ok: false; error: string };

/** Reads the first sheet off the UI thread; the mining worker then maps columns. */
export async function readEventLogFile(
  file: File,
  signal?: AbortSignal,
): Promise<string> {
  signal?.throwIfAborted();
  if (file.size > MAX_LOG_FILE_BYTES) throw new Error('file-too-large');
  if (!/\.xlsx$/i.test(file.name)) {
    const source = await file.text();
    signal?.throwIfAborted();
    return source;
  }
  if (file.size > MAX_XLSX_BYTES) throw new Error('file-too-large');
  const buffer = await file.arrayBuffer();
  signal?.throwIfAborted();
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/xlsx-log.worker.ts', import.meta.url), {
      type: 'module',
      name: 'flowculus-xlsx',
    });
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      worker.terminate();
    };
    const abort = () => {
      finish();
      reject(new DOMException('File reading cancelled.', 'AbortError'));
    };
    const timer = setTimeout(() => {
      finish();
      reject(new Error('xlsx-timeout'));
    }, XLSX_TIMEOUT_MS);
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }: MessageEvent<XlsxReply>) => {
      finish();
      if (data.ok) resolve(data.source);
      else reject(new Error(data.error));
    };
    const fail = () => {
      finish();
      reject(new Error('xlsx-invalid'));
    };
    worker.onerror = fail;
    worker.onmessageerror = fail;
    try {
      worker.postMessage(buffer, [buffer]);
    } catch (error) {
      finish();
      reject(error);
    }
  });
}
