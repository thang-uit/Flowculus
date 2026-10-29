import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fingerprintFile,
  openDeviceFiles,
  pickedFileBinding,
  permitDeviceWrite,
  type DeviceFileHandle,
} from './device-file-access';
const makeHandle = (name: string, text = '{}'): DeviceFileHandle => ({
  name,
  getFile: async () => new File([text], name),
  createWritable: vi.fn(),
});
afterEach(() => vi.unstubAllGlobals());
describe('native file opening', () => {
  it('retains native file identity for a parsed import without treating conversions as writable native models', async () => {
    const native = makeHandle('TestBPMN1.flowculus.json');
    const xml = makeHandle('diagram.bpmn');
    vi.stubGlobal('window', { showOpenFilePicker: vi.fn(async () => [native, xml]) });
    const files = await openDeviceFiles();
    expect(pickedFileBinding(files[0]!)?.handle).toBe(native);
    expect(pickedFileBinding(files[0]!)?.fingerprint).toBe(
      await fingerprintFile(files[0]!),
    );
    expect(pickedFileBinding(files[1]!)).toBeUndefined();
  });
  it('preserves cancellation and rejects too many files before reading them', async () => {
    vi.stubGlobal('window', {
      showOpenFilePicker: async () => {
        throw new DOMException('Cancel', 'AbortError');
      },
    });
    await expect(openDeviceFiles()).rejects.toMatchObject({ name: 'AbortError' });
    const handle = makeHandle('a.flowculus.json');
    const read = vi.spyOn(handle, 'getFile');
    vi.stubGlobal('window', { showOpenFilePicker: async () => Array(21).fill(handle) });
    await expect(openDeviceFiles()).rejects.toThrow('document-limit');
    expect(read).not.toHaveBeenCalled();
  });
  it('never prompts for write permission during automatic saving', async () => {
    const handle = {
      ...makeHandle('a.flowculus.json'),
      queryPermission: vi.fn(async () => 'prompt' as const),
      requestPermission: vi.fn(async () => 'granted' as const),
    };
    expect(await permitDeviceWrite(handle, true)).toBe(false);
    expect(handle.requestPermission).not.toHaveBeenCalled();
    expect(await permitDeviceWrite(handle, false)).toBe(true);
    expect(handle.requestPermission).toHaveBeenCalledOnce();
  });
});
