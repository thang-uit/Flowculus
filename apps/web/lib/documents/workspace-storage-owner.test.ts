import { afterEach, describe, expect, it, vi } from 'vitest';
import { acquireWorkspaceStorage } from './workspace-storage-owner';
afterEach(() => vi.unstubAllGlobals());
describe('browser workspace ownership', () => {
  it('degrades to local persistence when Web Locks is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    expect((await acquireWorkspaceStorage()).writable).toBe(true);
  });
  it('never grants a second writer when another window owns the lock', async () => {
    vi.stubGlobal('navigator', {
      locks: {
        request: async (
          _key: string,
          _options: unknown,
          callback: (lock: null) => Promise<void>,
        ) => callback(null),
      },
    });
    expect((await acquireWorkspaceStorage()).writable).toBe(false);
  });
  it('holds the writer lock until release', async () => {
    let finished = false;
    vi.stubGlobal('navigator', {
      locks: {
        request: async (
          _key: string,
          _options: unknown,
          callback: (lock: object) => Promise<void>,
        ) => {
          await callback({});
          finished = true;
        },
      },
    });
    const ownership = await acquireWorkspaceStorage();
    expect(ownership.writable).toBe(true);
    expect(finished).toBe(false);
    ownership.release();
    await vi.waitFor(() => expect(finished).toBe(true));
  });
});
