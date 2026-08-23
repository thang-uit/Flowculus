import { DEFAULT_DRAWIO_EMBED_URL } from '@flowculus/drawio-adapter';

/**
 * The hosted embed is the safe default. A public environment override lets a
 * deployment point to a self-hosted draw.io instance without coupling the
 * domain adapter to Next.js or browser globals.
 */
export const DRAWIO_EMBED_URL =
  process.env.NEXT_PUBLIC_DRAWIO_EMBED_URL?.trim() || DEFAULT_DRAWIO_EMBED_URL;

export const DRAWIO_ORIGIN = (() => {
  try {
    return new URL(DRAWIO_EMBED_URL).origin;
  } catch {
    return new URL(DEFAULT_DRAWIO_EMBED_URL).origin;
  }
})();
