import type { ProcessModel } from '@flowculus/process-model';

export const DEFAULT_DRAWIO_EMBED_URL =
  'https://embed.diagrams.net/?embed=1&embedInline=1&configure=1&proto=json&sidebar=0&toolbar=0&menubar=0&status=0&layers=0&nav=0&format=0&libraries=0&ui=min&spin=Loading%20editor...&noExitBtn=1&exportProtocol=1';

export interface DrawioEmbedConfig {
  url?: string;
  autosave?: boolean;
  dark?: boolean;
  title?: string;
  language?: string;
}

export interface DrawioLoadAction {
  action: 'load';
  xml: string;
  autosave?: 0 | 1;
  title?: string;
  dark?: 0 | 1;
  exportProtocol?: boolean;
  diffSync?: { patchOnly?: boolean };
  fit?: 0 | 1;
  border?: number;
}

export type DrawioAction =
  | DrawioLoadAction
  | { action: 'configure'; config: Record<string, unknown>; colorSchemeMeta?: boolean }
  | { action: 'export'; format: DrawioExportFormat; currentPage?: boolean }
  | { action: 'snapshot' }
  | { action: 'fit'; width?: number; height?: number }
  | { action: 'invokeAction'; actionName: string }
  | { action: 'resetEditor' };

export type DrawioExportFormat =
  'xml' | 'json' | 'svg' | 'xmlsvg' | 'png' | 'xmlpng' | 'jpg' | 'pdf';

export type DrawioExportData = string | DrawioJsonExport;

export interface DrawioMessageBase {
  event: string;
  xml?: string;
  message?: string;
  error?: string;
  format?: DrawioExportFormat;
  data?: DrawioExportData;
  filename?: string;
}

export interface DrawioJsonCell {
  id: string;
  type: 'layer' | 'group' | 'node' | 'edge';
  parent?: string;
  source?: string;
  target?: string;
  label?: string;
  html?: string;
  style?: string;
  value?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface DrawioJsonExport {
  version?: string;
  data?: string;
  /**
   * 0-based index of the page currently displayed in the editor.
   * draw.io includes this in JSON exports as `page`.
   */
  page?: number;
  pages: Array<{
    id: string;
    name: string;
    cells: DrawioJsonCell[];
  }>;
}

/**
 * Returns the 0-based index of the active page from a JSON export, or 0 as
 * fallback when the field is absent (single-page files).
 */
export const getActivePageIndex = (json: DrawioJsonExport): number =>
  typeof json.page === 'number' && json.page >= 0 ? json.page : 0;

export interface DrawioEvent extends DrawioMessageBase {
  event:
    | 'ready'
    | 'configure'
    | 'init'
    | 'load'
    | 'save'
    | 'autosave'
    | 'export'
    | 'exit'
    | 'openLink'
    | 'resize'
    | 'error';
  data?: DrawioExportData;
}

export const getDrawioEmbedUrl = (config: DrawioEmbedConfig = {}): string => {
  const url = new URL(config.url ?? DEFAULT_DRAWIO_EMBED_URL);
  if (config.autosave != null)
    url.searchParams.set('autosave', config.autosave ? '1' : '0');
  if (config.language) url.searchParams.set('lang', config.language);
  return url.toString();
};

export const isDrawioEvent = (value: unknown): value is DrawioEvent => {
  if (value == null || typeof value !== 'object') return false;
  const event = (value as { event?: unknown }).event;
  return typeof event === 'string';
};

export const createLoadAction = (
  xml: string,
  config: DrawioEmbedConfig = {},
): DrawioLoadAction => ({
  action: 'load',
  xml,
  autosave: config.autosave === false ? 0 : 1,
  dark: config.dark ? 1 : 0,
  title: config.title ?? 'Flowculus process model',
  exportProtocol: true,
  diffSync: { patchOnly: false },
  fit: 1,
  border: 0,
});

/**
 * The protocol package only transports data. XML-to-domain mapping belongs in
 * the browser adapter so this package stays independent of DOM and Next.js.
 */
export interface DrawioModelSnapshot {
  xml: string;
  model: ProcessModel | null;
}
