import { beforeEach, describe, expect, it, vi } from 'vitest';
const adapter = vi.hoisted(() => ({ export: vi.fn(), import: vi.fn() }));
vi.mock('@flowculus/drawio-adapter', () => ({
  exportDrawioXml: adapter.export,
  importDrawioXml: adapter.import,
}));
import { changeDrawioPage } from './drawio-page-transition';
import { useWorkspaceStore } from '../workspace-store';
import { INITIAL_PROCESS_MODEL } from '../initial-process-model';
import { createDocument } from './document-types';
const source = {
  xml: '<mxfile/>',
  pageIndex: 0,
  pages: [
    { id: 'one', name: 'First' },
    { id: 'two', name: 'Second' },
  ],
};
const next = { ...INITIAL_PROCESS_MODEL, name: 'Second', id: 'two' };
beforeEach(() => {
  vi.clearAllMocks();
  useWorkspaceStore
    .getState()
    .restoreDocuments(
      [createDocument(INITIAL_PROCESS_MODEL, { drawioSource: source }, 'pages')],
      'pages',
    );
  adapter.export.mockResolvedValue('<updated/>');
  adapter.import.mockResolvedValue({ model: next, pages: source.pages, pageIndex: 1 });
});
describe('draw.io page transitions', () => {
  it('preserves edited XML before loading a requested page', async () => {
    await changeDrawioPage(1, () => true);
    expect(adapter.export).toHaveBeenCalledWith(INITIAL_PROCESS_MODEL, source.xml);
    expect(useWorkspaceStore.getState().processModel.name).toBe('Second');
    expect(useWorkspaceStore.getState().drawioSource?.xml).toBe('<updated/>');
  });
  it('does not apply a stale switch after leaving and returning to the original document', async () => {
    let resolve!: (value: string) => void;
    adapter.export.mockImplementationOnce(
      () =>
        new Promise((finish) => {
          resolve = finish;
        }),
    );
    const original = useWorkspaceStore.getState().processModel;
    const switching = changeDrawioPage(1, () => true);
    useWorkspaceStore.getState().newDocument('Other');
    useWorkspaceStore.getState().switchDocument('pages');
    resolve('<updated/>');
    await switching;
    expect(useWorkspaceStore.getState().processModel).toBe(original);
    expect(useWorkspaceStore.getState().drawioSource).toBe(source);
  });
  it('rejects invalid indices and ignores cancellation before a decoded page can replace work', async () => {
    await expect(changeDrawioPage(-1, () => true)).rejects.toThrow(
      'Invalid draw.io page index',
    );
    expect(adapter.export).not.toHaveBeenCalled();
    await changeDrawioPage(1, () => false);
    expect(adapter.import).not.toHaveBeenCalled();
    expect(useWorkspaceStore.getState().drawioSource).toBe(source);
  });
});
