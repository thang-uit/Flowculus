/** Prevent two browser editor windows from silently overwriting the same drafts. */
export async function acquireWorkspaceStorage(): Promise<{
  writable: boolean;
  release: () => void;
}> {
  if (typeof navigator === 'undefined' || !navigator.locks)
    return { writable: true, release: () => undefined };
  return new Promise((resolve) => {
    void navigator.locks
      .request('flowculus-workspace-writer', { ifAvailable: true }, async (lock) => {
        if (!lock) {
          resolve({ writable: false, release: () => undefined });
          return;
        }
        await new Promise<void>((release) => resolve({ writable: true, release }));
      })
      .catch(() => resolve({ writable: false, release: () => undefined }));
  });
}
