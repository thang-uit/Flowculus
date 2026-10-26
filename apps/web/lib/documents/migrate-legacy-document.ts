import { importDrawioXml } from '@flowculus/drawio-adapter';
import { withAutoLayout } from '@flowculus/file-formats';
import type { LocalDraftSnapshot } from '@/lib/local-draft-snapshot';
import { createDocument, INITIAL_DOCUMENT_ID } from './document-types';

export async function migrateLegacyDocument(draft: LocalDraftSnapshot) {
  let model = draft.model;
  let source = draft.drawioSource ?? null;
  if (draft.drawioXml) {
    try {
      const imported = await importDrawioXml(draft.drawioXml);
      source ??= {
        xml: draft.drawioXml,
        pages: imported.pages,
        pageIndex: imported.pageIndex,
      };
      model = {
        ...model,
        nodes: Object.fromEntries(
          Object.entries(model.nodes).map(([id, node]) => [
            id,
            node.bounds ? node : { ...node, bounds: imported.model.nodes[id]?.bounds },
          ]),
        ),
      };
    } catch {
      /* Older geometry can be malformed; retain all domain fields and use layout. */
    }
  }
  return createDocument(
    withAutoLayout({ ...model, name: draft.modelName || model.name }),
    {
      analysisOptions: draft.analysisOptions,
      drawioSource: source,
    },
    INITIAL_DOCUMENT_ID,
  );
}
