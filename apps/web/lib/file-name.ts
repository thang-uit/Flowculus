const INVALID_FILE_NAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f]/g;
const TRAILING_DOTS_OR_SPACES = /[. ]+$/g;
const MAX_FILE_STEM_LENGTH = 120;

/**
 * Converts a user-provided model name into a portable download stem.
 * Vietnamese characters are preserved; only path/control characters are
 * removed so exports remain readable on Windows, macOS and Linux.
 */
export const safeFileStem = (value: string | undefined, fallback = 'process'): string => {
  const normalized = (value ?? '')
    .normalize('NFKC')
    .replace(INVALID_FILE_NAME_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(TRAILING_DOTS_OR_SPACES, '')
    .slice(0, MAX_FILE_STEM_LENGTH)
    .trim()
    .replace(TRAILING_DOTS_OR_SPACES, '');

  if (!normalized) return fallback;
  const reservedName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(normalized);
  return reservedName ? `_${normalized}` : normalized;
};

export type ExportArtifact =
  'model' | 'diagram' | 'analysis' | 'nodes' | 'edges' | 'event-log';
/** Locale-independent, sortable UTC naming shared by Save, Share and all exports. */
export function exportFileName(
  name: string | undefined,
  artifact: ExportArtifact,
  extension: string,
  at = new Date(),
): string {
  const slug =
    safeFileStem(name, 'process')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/\.(?:flowculus\.json|drawio|csv|json|xes|xml|png|jpe?g|svg)$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72)
      .replace(/-+$/g, '') || 'process';
  const stamp = at
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .replace(/\.\d{3}Z$/, 'Z');
  if (!/^[a-z0-9]+(?:\.[a-z0-9]+)*$/.test(extension))
    throw new TypeError('Invalid export extension');
  return `flowculus_${slug}_${artifact}_${stamp}.${extension}`;
}
