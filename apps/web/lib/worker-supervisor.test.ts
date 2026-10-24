import { describe, expect, it } from 'vitest';

import { createWorkerSupervisor, type WorkerLike } from './worker-supervisor';

type Listener = (event: { data?: unknown }) => void;

class FakeWorker implements WorkerLike {
  sent: Array<{ requestId: number; value: number }> = [];
  terminated = false;
  private listeners: Record<string, Listener[]> = { message: [], error: [] };

  postMessage(message: unknown) {
    this.sent.push(message as { requestId: number; value: number });
  }
  terminate() {
    this.terminated = true;
  }
  addEventListener(type: 'message' | 'error', listener: (event: never) => void) {
    this.listeners[type]!.push(listener as Listener);
  }
  reply(requestId: number) {
    this.listeners.message!.forEach((listener) =>
      listener({ data: { requestId, value: requestId } }),
    );
  }
  crash() {
    this.listeners.error!.forEach((listener) => listener({}));
  }
}

const setup = (overrides: { maxRestarts?: number } = {}) => {
  let clock = 0;
  const timers: Array<{ at: number; run: () => void; cleared: boolean }> = [];
  const workers: FakeWorker[] = [];
  const events: string[] = [];
  const responses: number[] = [];
  const supervisor = createWorkerSupervisor<
    { value: number },
    { requestId: number; value: number }
  >({
    create: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    timeoutMs: 1000,
    cancelAfterMs: 200,
    maxRestarts: overrides.maxRestarts ?? 2,
    onResponse: (response) => responses.push(response.requestId),
    onRestart: (attempt) => events.push(`restart:${attempt}`),
    onTimeout: (payload) => events.push(`timeout:${payload.value}`),
    onFailure: (payload) => events.push(`failure:${payload?.value ?? 'none'}`),
    now: () => clock,
    setTimer: (run, ms) => {
      const timer = { at: clock + ms, run, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimer: (handle) => {
      (handle as { cleared: boolean }).cleared = true;
    },
  });
  const advance = (ms: number) => {
    clock += ms;
    timers
      .filter((timer) => !timer.cleared && timer.at <= clock)
      .forEach((timer) => {
        timer.cleared = true;
        timer.run();
      });
  };
  return { supervisor, workers, events, responses, advance };
};

describe('worker supervisor', () => {
  it('delivers only the latest response and ignores stale ones', () => {
    const { supervisor, workers, responses } = setup();
    supervisor.request({ value: 1 });
    supervisor.request({ value: 2 });
    expect(workers).toHaveLength(1);
    workers[0]!.reply(1);
    workers[0]!.reply(2);
    expect(responses).toEqual([2]);
  });

  it('cancels a long stale computation by restarting the worker', () => {
    const { supervisor, workers, advance, responses } = setup();
    supervisor.request({ value: 1 });
    advance(300);
    supervisor.request({ value: 2 });
    expect(workers).toHaveLength(2);
    expect(workers[0]!.terminated).toBe(true);
    workers[1]!.reply(2);
    expect(responses).toEqual([2]);
  });

  it('times out without retrying the same input', () => {
    const { supervisor, workers, advance, events } = setup();
    supervisor.request({ value: 7 });
    advance(1000);
    expect(events).toEqual(['timeout:7']);
    expect(workers[0]!.terminated).toBe(true);
    expect(supervisor.request({ value: 8 })).toBe(true);
    expect(workers).toHaveLength(2);
  });

  it('restarts a crashed worker a bounded number of times, then fails once', () => {
    const { supervisor, workers, events } = setup({ maxRestarts: 2 });
    supervisor.request({ value: 3 });
    workers[0]!.crash();
    expect(workers[1]!.sent.at(-1)).toMatchObject({ value: 3 });
    workers[1]!.crash();
    workers[2]!.crash();
    expect(events).toEqual(['restart:1', 'restart:2', 'failure:3']);
    expect(supervisor.available).toBe(false);
    expect(supervisor.request({ value: 4 })).toBe(false);
  });

  it('resets the restart budget after a successful response', () => {
    const { supervisor, workers, events } = setup({ maxRestarts: 1 });
    supervisor.request({ value: 1 });
    workers[0]!.crash();
    workers[1]!.reply(1);
    supervisor.request({ value: 2 });
    workers[1]!.crash();
    expect(events).toEqual(['restart:1', 'restart:1']);
    expect(supervisor.available).toBe(true);
  });

  it('stops everything on dispose', () => {
    const { supervisor, workers } = setup();
    supervisor.request({ value: 1 });
    supervisor.dispose();
    expect(workers[0]!.terminated).toBe(true);
    expect(supervisor.request({ value: 2 })).toBe(false);
  });
});
