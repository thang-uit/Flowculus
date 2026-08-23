'use client';

import { GitFork, Path, X } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { countProcessPaths } from '@flowculus/analysis-engine';

import { Tooltip } from '@/components/ui/Tooltip';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore } from '@/lib/workspace-store';
import { cn } from '@/lib/cn';

const selectClass =
  'focus-ring h-9 w-full min-w-0 cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm text-[var(--text)]';

const formatNodeLabel = (label: string, id: string): string =>
  label.trim() && label.trim() !== id ? `${label} · ${id}` : id;

/**
 * A small, bounded graph query kept separate from the main analysis summary.
 * It is intentionally local UI state: selecting a segment should not mutate
 * the process model or cause a draw.io reload while the user is drawing.
 */
export function PathQueryPanel() {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const model = useWorkspaceStore((state) => state.processModel);

  const nodes = useMemo(
    () => Object.values(model.nodes).filter((node) => node.kind !== 'annotation'),
    [model.nodes],
  );
  const incomingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    nodes.forEach((node) => counts.set(node.id, 0));
    Object.values(model.edges).forEach((edge) => {
      if (edge.kind === 'message' || edge.kind === 'association') return;
      if (counts.has(edge.target))
        counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1);
    });
    return counts;
  }, [model.edges, nodes]);
  const defaultStartId = useMemo(
    () =>
      nodes.find((node) => node.kind === 'start')?.id ??
      nodes.find((node) => (incomingCounts.get(node.id) ?? 0) === 0)?.id ??
      nodes[0]?.id ??
      '',
    [incomingCounts, nodes],
  );
  const terminalNodes = useMemo(
    () =>
      nodes.filter(
        (node) =>
          node.kind === 'end' ||
          Object.values(model.edges).every(
            (edge) =>
              edge.source !== node.id ||
              edge.kind === 'message' ||
              edge.kind === 'association',
          ),
      ),
    [model.edges, nodes],
  );

  const [open, setOpen] = useState(false);
  const [startNodeId, setStartNodeId] = useState(defaultStartId);
  const [endNodeId, setEndNodeId] = useState('');

  const effectiveStartNodeId = nodes.some((node) => node.id === startNodeId)
    ? startNodeId
    : defaultStartId;
  const effectiveEndNodeId =
    endNodeId && nodes.some((node) => node.id === endNodeId) ? endNodeId : '';

  const report = useMemo(
    () =>
      effectiveStartNodeId
        ? countProcessPaths(
            model,
            effectiveEndNodeId
              ? {
                  startNodeId: effectiveStartNodeId,
                  endNodeIds: [effectiveEndNodeId],
                }
              : { startNodeId: effectiveStartNodeId },
          )
        : null,
    [effectiveEndNodeId, effectiveStartNodeId, model],
  );

  const selectedStart = nodes.find((node) => node.id === effectiveStartNodeId);
  const selectedEnd = nodes.find((node) => node.id === effectiveEndNodeId);
  const statusMessage =
    report?.status === 'cyclic'
      ? copy.pathQueryCycle
      : report?.status === 'limit'
        ? copy.pathQueryLimit
        : report?.status === 'ready' && report.count === 0
          ? copy.pathQueryNoRoute
          : report?.warning;

  const resetToDefaults = () => {
    setStartNodeId(defaultStartId);
    setEndNodeId('');
  };

  return (
    <CollapsibleSection
      open={open}
      onOpenChange={setOpen}
      title={copy.pathQuery}
      description={copy.pathQueryDescription}
      icon={<GitFork size={16} aria-hidden="true" />}
      badge={
        report?.status === 'ready' ? (
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--accent-strong)]">
            {report.count}
          </span>
        ) : null
      }
      className="border-b border-[var(--border)] bg-[var(--surface)]"
      headerClassName="px-4 sm:px-6 py-3"
      contentClassName="border-t border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-6"
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <label className="min-w-0 space-y-1.5" htmlFor="path-query-start">
          <span className="block text-[11px] font-medium text-[var(--muted-strong)]">
            {copy.pathQueryStart}
          </span>
          <select
            id="path-query-start"
            value={effectiveStartNodeId}
            onChange={(event) => setStartNodeId(event.target.value)}
            className={selectClass}
          >
            {nodes.length === 0 ? <option value="">{copy.emptyValue}</option> : null}
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {formatNodeLabel(node.label, node.id)}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-0 space-y-1.5" htmlFor="path-query-end">
          <span className="block text-[11px] font-medium text-[var(--muted-strong)]">
            {copy.pathQueryEnd}
          </span>
          <select
            id="path-query-end"
            value={effectiveEndNodeId}
            onChange={(event) => setEndNodeId(event.target.value)}
            className={selectClass}
          >
            <option value="">{copy.pathQueryAllEnds}</option>
            {(terminalNodes.length > 0 ? terminalNodes : nodes).map((node) => (
              <option key={node.id} value={node.id}>
                {formatNodeLabel(node.label, node.id)}
              </option>
            ))}
          </select>
        </label>

        <Tooltip content={copy.resetPathQuery}>
          <button
            type="button"
            onClick={resetToDefaults}
            aria-label={copy.resetPathQuery}
            title={copy.resetPathQuery}
            className="focus-ring inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-xs font-medium text-[var(--muted-strong)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)] active:scale-[0.98]"
          >
            <X size={14} aria-hidden="true" />
            <span className="hidden sm:inline">{copy.resetPathQuery}</span>
          </button>
        </Tooltip>
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
        <Path
          size={15}
          className="shrink-0 text-[var(--accent-strong)]"
          aria-hidden="true"
        />
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          {copy.pathQueryFormula}
        </span>
        <code className="min-w-0 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-[var(--text)] scrollbar-thin">
          {report?.formula ?? copy.pathCountUnavailable}
        </code>
      </div>

      {statusMessage ? (
        <p
          className={cn(
            'mt-2 text-[11px] leading-5',
            report?.status === 'ready' && report.count === 0
              ? 'text-[var(--muted)]'
              : 'text-[var(--accent-strong)]',
          )}
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}

      <p className="mt-2 truncate text-[10px] text-[var(--muted)]">
        {selectedStart?.label ?? copy.pathQueryMissingStart}
        {' → '}
        {selectedEnd?.label ?? copy.pathQueryAllEnds}
      </p>
    </CollapsibleSection>
  );
}
