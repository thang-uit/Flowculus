import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fingerprintText, type DeviceFileBinding } from './device-file-access';
const storage = vi.hoisted(() => ({
  read: vi.fn(),
  store: vi.fn(async () => undefined),
}));
vi.mock('./device-file-storage', () => ({
  readDeviceBindings: storage.read,
  storeDeviceBinding: storage.store,
}));
import {
  bindDeviceFile,
  forgetDeviceFile,
  getDeviceBinding,
  hasDeviceFile,
  isDeviceAutoSave,
  restoreDeviceBindings,
  setDeviceAutoSave,
} from './device-file-bindings';
const binding = (name: string): DeviceFileBinding => ({
  handle: { name, createWritable: vi.fn() },
  fingerprint: 'a'.repeat(64),
});
beforeEach(() => {
  vi.clearAllMocks();
});
describe('file connection recovery', () => {
  it('restores a file connection without enabling automatic writes', async () => {
    const file = binding('Saved.flowculus.json');
    storage.read.mockResolvedValueOnce(new Map([['restored', file]]));
    await restoreDeviceBindings(['restored']);
    expect(getDeviceBinding('restored')).toBe(file);
    expect(isDeviceAutoSave('restored')).toBe(false);
    forgetDeviceFile('restored');
  });
  it('never resurrects a closed tab or replaces a newer connection after a slow read', async () => {
    let finish!: (value: Map<string, DeviceFileBinding>) => void;
    storage.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const recovering = restoreDeviceBindings(['closed', 'newer']);
    const fresh = binding('Fresh.flowculus.json');
    forgetDeviceFile('closed');
    bindDeviceFile('newer', fresh);
    finish(
      new Map([
        ['closed', binding('Old.flowculus.json')],
        ['newer', binding('Old.flowculus.json')],
      ]),
    );
    await recovering;
    expect(hasDeviceFile('closed')).toBe(false);
    expect(getDeviceBinding('newer')).toBe(fresh);
    forgetDeviceFile('newer');
  });
  it('closing forgets both the connection and auto-save without affecting another file', () => {
    bindDeviceFile('a', binding('a.flowculus.json'));
    bindDeviceFile('b', binding('b.flowculus.json'));
    setDeviceAutoSave('a', true);
    forgetDeviceFile('a');
    expect(hasDeviceFile('a')).toBe(false);
    expect(isDeviceAutoSave('a')).toBe(false);
    expect(hasDeviceFile('b')).toBe(true);
    expect(storage.store).toHaveBeenCalledWith('a', null);
    forgetDeviceFile('b');
  });
  it('reconnects only the matching persisted saved baseline, never an older Save As target', async () => {
    const old = {
      ...binding('Old.flowculus.json'),
      contentFingerprint: await fingerprintText('old'),
    };
    const good = {
      ...binding('Current.flowculus.json'),
      contentFingerprint: await fingerprintText('current'),
    };
    storage.read.mockResolvedValueOnce(
      new Map([
        ['old-target', old],
        ['matching-target', good],
      ]),
    );
    await restoreDeviceBindings(
      ['old-target', 'matching-target'],
      new Map([
        ['old-target', 'current'],
        ['matching-target', 'current'],
      ]),
    );
    expect(hasDeviceFile('old-target')).toBe(false);
    expect(getDeviceBinding('matching-target')).toBe(good);
    forgetDeviceFile('matching-target');
  });
  it('unavailable handle storage leaves browser drafts and session connections usable', async () => {
    const file = binding('Session.flowculus.json');
    storage.read.mockRejectedValueOnce(new Error('Storage denied'));
    bindDeviceFile('session', file);
    await expect(restoreDeviceBindings(['session'])).resolves.toBeUndefined();
    expect(getDeviceBinding('session')).toBe(file);
    forgetDeviceFile('session');
  });
});
