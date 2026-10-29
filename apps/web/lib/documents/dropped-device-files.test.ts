import { afterEach, expect, it, vi } from 'vitest';
import { droppedDeviceFiles } from './dropped-device-files';
import { pickedFileBinding } from './device-file-access';
afterEach(() => vi.unstubAllGlobals());
it('captures native drop handles before asynchronous work and retains each same-named file identity', async () => {
  const files = [
    new File(['a'], 'Same.flowculus.json'),
    new File(['b'], 'Same.flowculus.json'),
  ];
  const handles = files.map((file) => ({
    kind: 'file',
    name: file.name,
    getFile: async () => file,
    createWritable: vi.fn(),
  }));
  const methods = handles.map((handle) => vi.fn(async () => handle));
  const transfer = {
    files,
    items: files.map((file, i) => ({
      kind: 'file',
      getAsFile: () => file,
      getAsFileSystemHandle: methods[i],
    })),
  } as unknown as DataTransfer;
  const reading = droppedDeviceFiles(transfer);
  expect(methods.every((method) => method.mock.calls.length === 1)).toBe(true);
  const selected = await reading;
  expect(pickedFileBinding(selected[0]!)?.handle).toBe(handles[0]);
  expect(pickedFileBinding(selected[1]!)?.handle).toBe(handles[1]);
});
it('keeps readable dropped contents when the browser denies handle access', async () => {
  const file = new File(['a'], 'A.flowculus.json');
  const transfer = {
    files: [file],
    items: [
      {
        kind: 'file',
        getAsFile: () => file,
        getAsFileSystemHandle: async () => {
          throw new DOMException('Denied', 'NotAllowedError');
        },
      },
    ],
  } as unknown as DataTransfer;
  expect(await droppedDeviceFiles(transfer)).toEqual([file]);
  expect(pickedFileBinding(file)).toBeUndefined();
});

it('bounds dropped selections before requesting or hashing any file handles', async () => {
  const handle = vi.fn();
  const transfer = {
    files: Array(21).fill(new File(['x'], 'a.flowculus.json')),
    items: [{ kind: 'file', getAsFileSystemHandle: handle }],
  } as unknown as DataTransfer;
  await expect(droppedDeviceFiles(transfer)).rejects.toThrow('document-limit');
  expect(handle).not.toHaveBeenCalled();
});
it('falls back to the dropped file if the handle API throws synchronously', async () => {
  const file = new File(['x'], 'a.flowculus.json');
  const transfer = {
    files: [file],
    items: [
      {
        kind: 'file',
        getAsFile: () => file,
        getAsFileSystemHandle: () => {
          throw new DOMException('Denied', 'SecurityError');
        },
      },
    ],
  } as unknown as DataTransfer;
  expect(await droppedDeviceFiles(transfer)).toEqual([file]);
});
