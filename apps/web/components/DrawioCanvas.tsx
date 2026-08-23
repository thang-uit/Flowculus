'use client';

import {
  createLoadAction,
  getActivePageIndex,
  getDrawioEmbedUrl,
  isDrawioEvent,
  type DrawioExportData,
  type DrawioEvent,
  type DrawioExportFormat,
} from '@flowculus/drawio-adapter';
import type { ProcessModel } from '@flowculus/process-model';
import { useTheme } from 'next-themes';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { ArrowClockwise } from '@phosphor-icons/react';

import { drawioJsonToProcessModel, isDrawioJsonExport } from '@/lib/drawio-model';
import { insertSemanticShapeIntoXml } from '@/lib/drawio-xml';
import type { ShapeInsertPosition } from '@/lib/drawio-xml';
import { getWorkspaceCopy } from '@/lib/i18n';
import { INITIAL_DRAWIO_XML } from '@/lib/initial-drawio';
import { useWorkspaceStore } from '@/lib/workspace-store';
import type { SemanticShapeTool } from '@/lib/shape-tools';
import { DRAWIO_EMBED_URL, DRAWIO_ORIGIN } from '@/lib/drawio-config';
import { Tooltip } from '@/components/ui/Tooltip';

export interface DrawioCanvasHandle {
  export: (format: DrawioExportFormat) => Promise<DrawioExportData | null>;
  save: () => void;
  /** Invoke a native draw.io action without routing pointer frames through React. */
  invokeAction: (actionName: string) => void;
  /** Switch to a draw.io page by 0-based index. */
  selectPage: (pageIndex: number) => void;
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  insertShape: (
    tool: SemanticShapeTool,
    label: string,
    position?: ShapeInsertPosition,
  ) => string | null;
  refresh: () => void;
  load: (xml: string) => void;
  getXml: () => string;
}

interface DrawioCanvasProps {
  className?: string;
  initialXml?: string;
  onModelChange?: (model: ProcessModel, xml: string) => void;
  onXmlChange?: (xml: string) => void;
  onStatusChange?: (status: 'loading' | 'ready' | 'saving' | 'error') => void;
  onFallbackChange?: (visible: boolean) => void;
}

const parseMessage = (data: unknown): DrawioEvent | null => {
  if (typeof data === 'string') {
    try {
      const parsed: unknown = JSON.parse(data);
      return isDrawioEvent(parsed) ? (parsed as DrawioEvent) : null;
    } catch {
      return null;
    }
  }
  return isDrawioEvent(data) ? (data as DrawioEvent) : null;
};

// diagrams.net may redirect the public embed host to app.diagrams.net before
// the protocol starts. Keep the allow-list narrow, but accept that documented
// redirect so a valid editor handshake is not mistaken for a network error.
const DRAWIO_REDIRECT_ORIGINS = new Set([
  'https://app.diagrams.net',
  'https://embed.diagrams.net',
  'https://www.diagrams.net',
]);

export const DrawioCanvas = forwardRef<DrawioCanvasHandle, DrawioCanvasProps>(
  function DrawioCanvas(
    {
      className,
      initialXml = INITIAL_DRAWIO_XML,
      onModelChange,
      onXmlChange,
      onStatusChange,
      onFallbackChange,
    },
    ref,
  ) {
    const locale = useWorkspaceStore((state) => state.locale);
    const copy = getWorkspaceCopy(locale);
    const { resolvedTheme } = useTheme();
    const setPages = useWorkspaceStore((state) => state.setPages);
    const setCurrentPageIndex = useWorkspaceStore((state) => state.setCurrentPageIndex);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const drawioOriginRef = useRef(DRAWIO_ORIGIN);
    const latestXmlRef = useRef(initialXml);
    // Theme changes belong to the Flowculus shell. Do not reload the native
    // editor for them: a load action resets selection, view state and can
    // interrupt a drag that is currently owned by draw.io.
    const resolvedThemeRef = useRef(resolvedTheme);
    const readyRef = useRef(false);
    const loadedRef = useRef(false);
    const lastPageIndexRef = useRef<number>(-1);
    const jsonRequestTimerRef = useRef<number | null>(null);
    const fallbackTimerRef = useRef<number | null>(null);
    const loadTimeoutRef = useRef<number | null>(null);
    const handshakeIntervalRef = useRef<number | null>(null);
    const exportResolversRef = useRef<
      Map<DrawioExportFormat, (data: DrawioExportData | null) => void>
    >(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [iframeKey, setIframeKey] = useState(0);

    useEffect(() => {
      resolvedThemeRef.current = resolvedTheme;
    }, [resolvedTheme]);

    const clearLoadTimeout = useCallback(() => {
      if (loadTimeoutRef.current != null) {
        window.clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    }, []);

    const clearFallbackTimer = useCallback(() => {
      if (fallbackTimerRef.current != null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    }, []);

    const clearHandshakeInterval = useCallback(() => {
      if (handshakeIntervalRef.current != null) {
        window.clearInterval(handshakeIntervalRef.current);
        handshakeIntervalRef.current = null;
      }
    }, []);

    const retryEditor = useCallback(() => {
      clearLoadTimeout();
      clearFallbackTimer();
      clearHandshakeInterval();
      readyRef.current = false;
      loadedRef.current = false;
      setHasError(false);
      setIsLoading(true);
      onFallbackChange?.(false);
      exportResolversRef.current.forEach((resolve) => resolve(null));
      exportResolversRef.current.clear();
      setIframeKey((current) => current + 1);
    }, [clearFallbackTimer, clearHandshakeInterval, clearLoadTimeout, onFallbackChange]);

    const armLoadTimeout = useCallback(() => {
      clearLoadTimeout();
      clearFallbackTimer();
      // The hosted editor can take several seconds to bootstrap on a cold
      // mobile connection. Show the local, read-only semantic preview early
      // while the native editor continues its handshake in the background.
      fallbackTimerRef.current = window.setTimeout(() => {
        fallbackTimerRef.current = null;
        if (!loadedRef.current) onFallbackChange?.(true);
      }, 4_500);
      loadTimeoutRef.current = window.setTimeout(() => {
        loadTimeoutRef.current = null;
        if (loadedRef.current) return;
        setIsLoading(false);
        setHasError(true);
        onStatusChange?.('error');
      }, 15_000);
    }, [clearFallbackTimer, clearLoadTimeout, onFallbackChange, onStatusChange]);

    const postAction = useCallback((action: unknown) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      try {
        iframe.contentWindow.postMessage(JSON.stringify(action), drawioOriginRef.current);
      } catch {
        // The first polling tick can race the about:blank iframe before the
        // remote origin commits. The next tick/onLoad retries safely.
      }
    }, []);

    const startHandshake = useCallback(() => {
      // Hydration can finish after a very fast CDN iframe has already emitted
      // its first protocol event. Sending one idempotent load action after the
      // listener is attached closes that race without touching draw.io's drag
      // path or remounting the editor.
      if (!iframeRef.current?.contentWindow || loadedRef.current) return;
      readyRef.current = true;
      postAction(
        createLoadAction(latestXmlRef.current, {
          autosave: true,
          dark: resolvedThemeRef.current === 'dark',
          title: copy.modelName,
        }),
      );
      if (loadTimeoutRef.current == null) armLoadTimeout();
    }, [armLoadTimeout, copy.modelName, postAction]);

    const beginHandshakePolling = useCallback(() => {
      if (handshakeIntervalRef.current != null) return;
      let attempts = 0;
      handshakeIntervalRef.current = window.setInterval(() => {
        attempts += 1;
        if (loadedRef.current || attempts > 30) {
          clearHandshakeInterval();
          return;
        }
        startHandshake();
      }, 500);
    }, [clearHandshakeInterval, startHandshake]);

    const requestJsonSnapshot = useCallback(() => {
      if (!readyRef.current) return;
      postAction({
        action: 'export',
        format: 'json',
        allPages: true,
        includeData: true,
      });
    }, [postAction]);

    const scheduleJsonSnapshot = useCallback(() => {
      if (jsonRequestTimerRef.current != null) {
        window.clearTimeout(jsonRequestTimerRef.current);
      }
      jsonRequestTimerRef.current = window.setTimeout(() => {
        jsonRequestTimerRef.current = null;
        requestJsonSnapshot();
      }, 280);
    }, [requestJsonSnapshot]);

    const loadXml = useCallback(
      (xml: string) => {
        latestXmlRef.current = xml;
        if (readyRef.current) {
          loadedRef.current = false;
          postAction(
            createLoadAction(xml, {
              autosave: true,
              dark: resolvedThemeRef.current === 'dark',
              title: copy.modelName,
            }),
          );
        }
      },
      [copy.modelName, postAction],
    );

    const insertShape = useCallback(
      (tool: SemanticShapeTool, label: string, position?: ShapeInsertPosition) => {
        const inserted = insertSemanticShapeIntoXml(
          latestXmlRef.current,
          tool,
          label,
          position,
        );
        if (!inserted) return null;
        latestXmlRef.current = inserted.xml;
        onXmlChange?.(inserted.xml);
        loadXml(inserted.xml);
        return inserted.id;
      },
      [loadXml, onXmlChange],
    );

    // The hosted editor can finish its bootstrap before React's message
    // listener effect is attached (especially on a warm CDN connection).
    // The iframe load event is a safe second handshake in that case.
    const handleIframeLoad = useCallback(() => {
      setIsLoading(true);
      setHasError(false);
      // The iframe's `load` event only means that the remote editor document
      // finished loading. The embed protocol still has to complete its
      // `init`/`load` handshake before the canvas can accept actions or be
      // exported, so keep the host status in `loading` until the protocol's
      // `load` event arrives.
      onStatusChange?.('loading');
      startHandshake();
      beginHandshakePolling();
    }, [beginHandshakePolling, onStatusChange, startHandshake]);

    const requestExport = useCallback(
      (format: DrawioExportFormat): Promise<DrawioExportData | null> => {
        if (!readyRef.current) return Promise.resolve(null);
        // The embed protocol renders raster JPG through its PNG canvas path;
        // the browser-side host converts that data URI to a real JPEG. Its
        // hosted PDF action returns an SVG preview, which the host can print.
        const protocolFormat: DrawioExportFormat =
          format === 'jpg' ? 'png' : format === 'pdf' ? 'svg' : format;
        return new Promise((resolve) => {
          exportResolversRef.current.set(protocolFormat, resolve);
          postAction({
            action: 'export',
            format: protocolFormat,
            currentPage: true,
            includeData: protocolFormat === 'json',
          });
        });
      },
      [postAction],
    );

    useImperativeHandle(
      ref,
      () => ({
        export: requestExport,
        // draw.io names the action field `actionName` in the embed protocol.
        save: () => postAction({ action: 'invokeAction', actionName: 'save' }),
        invokeAction: (actionName: string) => {
          if (!actionName.trim()) return;
          postAction({ action: 'invokeAction', actionName });
        },
        selectPage: (pageIndex: number) => {
          // draw.io embed protocol: `selectPage` actionName + page index payload.
          // Fallback: navigate via keyboard shortcut if direct action unsupported.
          postAction({
            action: 'invokeAction',
            actionName: 'selectPage',
            page: pageIndex,
          });
        },
        fit: () => postAction({ action: 'fit' }),
        zoomIn: () => postAction({ action: 'invokeAction', actionName: 'zoomIn' }),
        zoomOut: () => postAction({ action: 'invokeAction', actionName: 'zoomOut' }),
        insertShape,
        refresh: requestJsonSnapshot,
        load: loadXml,
        getXml: () => latestXmlRef.current,
      }),
      [insertShape, loadXml, postAction, requestExport, requestJsonSnapshot],
    );

    const handleDrawioEvent = useCallback(
      (event: DrawioEvent) => {
        switch (event.event) {
          case 'ready':
            onStatusChange?.('loading');
            return;
          case 'configure':
            // Inline mode asks the host for configuration before it starts
            // the embed protocol. Keep the config intentionally small: the
            // Flowculus shell owns theme and controls, while draw.io owns the
            // editable canvas and routing engine.
            postAction({
              action: 'configure',
              config: {
                enableInlineToolbar: false,
                enablePositionGuides: true,
                enableSizeGuides: true,
              },
              colorSchemeMeta: true,
            });
            return;
          case 'init':
            readyRef.current = true;
            postAction(
              createLoadAction(latestXmlRef.current, {
                autosave: true,
                dark: resolvedThemeRef.current === 'dark',
                title: copy.modelName,
              }),
            );
            armLoadTimeout();
            return;
          case 'load':
            clearLoadTimeout();
            clearFallbackTimer();
            clearHandshakeInterval();
            loadedRef.current = true;
            onFallbackChange?.(false);
            if (event.xml) {
              latestXmlRef.current = event.xml;
              onXmlChange?.(event.xml);
            }
            setIsLoading(false);
            setHasError(false);
            onStatusChange?.('ready');
            requestJsonSnapshot();
            return;
          case 'autosave':
          case 'save':
            if (event.xml) {
              latestXmlRef.current = event.xml;
              onXmlChange?.(event.xml);
              if (event.event === 'autosave') scheduleJsonSnapshot();
            }
            onStatusChange?.(event.event === 'save' ? 'saving' : 'ready');
            return;
          case 'export': {
            const format = event.format;
            if (!format) return;
            const resolver = exportResolversRef.current.get(format);
            const data = format === 'xml' ? (event.xml ?? null) : (event.data ?? null);
            if (event.xml) {
              latestXmlRef.current = event.xml;
              onXmlChange?.(event.xml);
            }
            if (resolver) {
              resolver(data);
              exportResolversRef.current.delete(format);
            }
            if (data && format === 'json') {
              try {
                const parsed: unknown =
                  typeof data === 'string' ? JSON.parse(data) : data;
                if (isDrawioJsonExport(parsed)) {
                  // ── Page change detection ───────────────────────────────
                  const activePageIdx = getActivePageIndex(parsed);
                  if (activePageIdx !== lastPageIndexRef.current) {
                    lastPageIndexRef.current = activePageIdx;
                    setCurrentPageIndex(activePageIdx);
                  }
                  // Sync pages list whenever it changes
                  const pageList = parsed.pages.map((p) => ({ id: p.id, name: p.name }));
                  setPages(pageList);
                  // ── Model update for active page cells only ─────────────
                  onModelChange?.(
                    drawioJsonToProcessModel(parsed, copy.modelName),
                    latestXmlRef.current,
                  );
                }
              } catch {
                onStatusChange?.('error');
              }
            }
            return;
          }
          case 'error':
            // Exporting an optional JSON snapshot is not supported by every
            // hosted draw.io build. Once the editable canvas has emitted its
            // `load` event, keep the canvas usable and leave model updates to
            // the last committed XML instead of covering it with an error
            // banner for a non-critical protocol action.
            if (loadedRef.current) {
              onStatusChange?.('ready');
              return;
            }
            clearLoadTimeout();
            clearHandshakeInterval();
            setHasError(true);
            setIsLoading(false);
            onStatusChange?.('error');
            return;
          default:
            return;
        }
      },
      [
        clearHandshakeInterval,
        clearFallbackTimer,
        clearLoadTimeout,
        copy.modelName,
        armLoadTimeout,
        onModelChange,
        onFallbackChange,
        onStatusChange,
        onXmlChange,
        postAction,
        requestJsonSnapshot,
        scheduleJsonSnapshot,
        setCurrentPageIndex,
        setPages,
      ],
    );

    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (event.source !== iframeRef.current?.contentWindow) return;
        const isConfiguredOrigin = event.origin === DRAWIO_ORIGIN;
        const isKnownRedirect = DRAWIO_REDIRECT_ORIGINS.has(event.origin);
        if (!isConfiguredOrigin && !isKnownRedirect) return;
        // Use the final origin for all subsequent postMessage calls. This is
        // required when embed.diagrams.net redirects to app.diagrams.net.
        drawioOriginRef.current = event.origin;
        const message = parseMessage(event.data);
        if (message) handleDrawioEvent(message);
      };

      window.addEventListener('message', handleMessage);
      // Arm the timeout before the remote iframe emits `load`. A blocked CDN
      // request may never fire that DOM event, but the local semantic preview
      // should still become available instead of leaving an endless spinner.
      armLoadTimeout();
      const handshakeTimer = window.setTimeout(startHandshake, 0);
      beginHandshakePolling();
      return () => {
        window.removeEventListener('message', handleMessage);
        window.clearTimeout(handshakeTimer);
        clearFallbackTimer();
        clearHandshakeInterval();
        if (jsonRequestTimerRef.current != null) {
          window.clearTimeout(jsonRequestTimerRef.current);
        }
        clearLoadTimeout();
      };
    }, [
      beginHandshakePolling,
      armLoadTimeout,
      clearFallbackTimer,
      clearHandshakeInterval,
      clearLoadTimeout,
      handleDrawioEvent,
      iframeKey,
      startHandshake,
    ]);

    return (
      <div
        className={`absolute inset-0 overflow-hidden bg-[var(--surface-raised)] ${className ?? ''}`}
      >
        <iframe
          key={iframeKey}
          ref={iframeRef}
          title={copy.drawioEditor}
          // Keep the native editor English-first. Flowculus labels follow the
          // locale toggle without remounting the iframe and risking unsaved
          // pointer edits.
          src={getDrawioEmbedUrl({ url: DRAWIO_EMBED_URL, language: 'en' })}
          className="absolute inset-0 size-full border-0 bg-white"
          allow="clipboard-read; clipboard-write; fullscreen"
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={handleIframeLoad}
          onError={() => {
            if (loadedRef.current) return;
            clearLoadTimeout();
            setHasError(true);
            setIsLoading(false);
            onStatusChange?.('error');
          }}
        />
        {isLoading ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--surface-raised)]/90 backdrop-blur-[2px]">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted-strong)] shadow-[var(--shadow-soft)]">
              <span
                className="size-2 animate-pulse rounded-full bg-[var(--accent)]"
                aria-hidden="true"
              />
              {copy.drawioEditor}...
            </div>
          </div>
        ) : null}
        {hasError ? (
          <div
            className="absolute inset-x-4 bottom-4 z-[2] flex items-center justify-between gap-3 rounded-xl border border-[var(--danger)]/40 bg-[var(--surface)] px-4 py-3 text-xs text-[var(--muted-strong)] shadow-[var(--shadow-soft)]"
            role="alert"
          >
            <span>{copy.drawioLoadError}</span>
            <Tooltip content={copy.retryEditor}>
              <button
                type="button"
                onClick={retryEditor}
                aria-label={copy.retryEditor}
                title={copy.retryEditor}
                className="focus-ring inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 font-semibold text-[var(--accent-ink)] transition-transform hover:brightness-[1.03] active:translate-y-px"
              >
                <ArrowClockwise size={14} aria-hidden="true" />
                <span className="hidden sm:inline">{copy.retryEditor}</span>
              </button>
            </Tooltip>
          </div>
        ) : null}
      </div>
    );
  },
);
