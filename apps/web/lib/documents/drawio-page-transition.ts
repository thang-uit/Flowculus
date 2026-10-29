import { exportDrawioXml, importDrawioXml } from '@flowculus/drawio-adapter';
import { withAutoLayout } from '@flowculus/file-formats';
import { useWorkspaceStore } from '@/lib/workspace-store';

/** Page decoding may await decompression. Any intervening document activation cancels it. */
export async function changeDrawioPage(
  pageIndex: number,
  isCurrent: () => boolean,
): Promise<void> {
  const state = useWorkspaceStore.getState();
  const source = state.drawioSource;
  if (!source || source.pageIndex === pageIndex) return;
  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= source.pages.length)
    throw new Error('Invalid draw.io page index');
  const xml = await exportDrawioXml(state.processModel, source.xml);
  if (!isCurrent()) return;
  const imported = await importDrawioXml(xml, {
    pageIndex,
    fallbackName: state.modelName,
  });
  const current = useWorkspaceStore.getState();
  if (
    !isCurrent() ||
    current.modelRevision !== state.modelRevision ||
    current.activeDocumentId !== state.activeDocumentId ||
    current.processModel !== state.processModel ||
    current.drawioSource !== source
  )
    return;
  current.loadModel(withAutoLayout(imported.model), {
    drawioSource: { xml, pages: imported.pages, pageIndex: imported.pageIndex },
  });
}
