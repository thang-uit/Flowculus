import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readEventLogFile, MAX_XLSX_BYTES } from './read-event-log-file';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  terminated = false;
  constructor() {
    FakeWorker.instances.push(this);
  }
  terminate() {
    this.terminated = true;
  }
  postMessage() {}
}
const xlsx = (size = 64): File =>
  ({ name: 'log.xlsx', size, arrayBuffer: async () => new ArrayBuffer(size) }) as File;

beforeEach(() => {
  vi.useFakeTimers();
  FakeWorker.instances = [];
  vi.stubGlobal('Worker', FakeWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('event-log file lifecycle', () => {
  it('terminates XLSX extraction on cancellation and clears the timeout', async () => {
    const controller = new AbortController();
    const pending = readEventLogFile(xlsx(), controller.signal);
    const failure = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    controller.abort();
    await failure;
    expect(FakeWorker.instances[0].terminated).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('releases the worker after success, error and timeout', async () => {
    const first = readEventLogFile(xlsx());
    await Promise.resolve();
    FakeWorker.instances[0].onmessage?.({
      data: { ok: true, source: 'caseId,activity,timestamp' },
    });
    await expect(first).resolves.toBe('caseId,activity,timestamp');
    expect(FakeWorker.instances[0].terminated).toBe(true);
    const second = readEventLogFile(xlsx());
    const error = expect(second).rejects.toThrow('xlsx-invalid');
    await Promise.resolve();
    FakeWorker.instances[1].onmessageerror?.();
    await error;
    const third = readEventLogFile(xlsx());
    const timeout = expect(third).rejects.toThrow('xlsx-timeout');
    await vi.advanceTimersByTimeAsync(45_000);
    await timeout;
    expect(FakeWorker.instances.every((worker) => worker.terminated)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects oversized/cancelled reads without starting a worker', async () => {
    await expect(readEventLogFile(xlsx(MAX_XLSX_BYTES + 1))).rejects.toThrow(
      'file-too-large',
    );
    const controller = new AbortController();
    controller.abort();
    await expect(readEventLogFile(xlsx(), controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(FakeWorker.instances).toHaveLength(0);
  });
  it('discards a text file that finishes reading after cancellation', async () => {
    let finish: (value: string) => void = () => undefined;
    const controller = new AbortController();
    const file = {
      name: 'slow.csv',
      size: 40,
      text: () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    } as File;
    const pending = readEventLogFile(file, controller.signal);
    const failure = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    finish('old log');
    await failure;
  });
});
