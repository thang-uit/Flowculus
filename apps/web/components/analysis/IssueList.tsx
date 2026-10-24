'use client';

import { Crosshair, Info, Warning, WarningOctagon } from '@phosphor-icons/react';
import type { Diagnostic, DiagnosticSeverity } from '@flowculus/validation';

import { formatDiagnostic, groupDiagnostics } from '@/lib/diagnostic-messages';
import { getWorkspaceCopy } from '@/lib/i18n';
import { useWorkspaceStore, type ElementReference } from '@/lib/workspace-store';

const SEVERITY_ORDER: DiagnosticSeverity[] = ['error', 'warning', 'info'];

const SEVERITY_STYLE: Record<DiagnosticSeverity, { icon: typeof Warning; tone: string }> =
  {
    error: { icon: WarningOctagon, tone: 'text-[var(--danger)]' },
    warning: { icon: Warning, tone: 'text-[var(--accent-strong)]' },
    info: { icon: Info, tone: 'text-[var(--muted-strong)]' },
  };

/** `nodes.<id>` / `edges.<id>` → the element a diagnostic points at. */
export const elementFromPath = (path: string | undefined): ElementReference | null => {
  const match = path?.match(/^(nodes|edges)\.([^.]+)/);
  if (!match) return null;
  return { elementType: match[1] === 'nodes' ? 'node' : 'edge', elementId: match[2] };
};

/**
 * Engine and validation findings grouped by severity, each with its quality
 * impact and a "Show" action that selects the element on the canvas.
 */
export function IssueList({ issues }: Readonly<{ issues: Diagnostic[] }>) {
  const locale = useWorkspaceStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const focusElement = useWorkspaceStore((state) => state.focusElement);
  const groups = groupDiagnostics(issues);

  if (issues.length === 0) {
    return <p className="text-xs text-[var(--muted)]">{copy.quality.noIssues}</p>;
  }

  return (
    <div className="space-y-3">
      {SEVERITY_ORDER.filter((severity) => groups[severity].length > 0).map(
        (severity) => {
          const { icon: Icon, tone } = SEVERITY_STYLE[severity];
          return (
            <section key={severity} aria-label={copy.quality.issueGroups[severity]}>
              <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[var(--muted-strong)]">
                <Icon size={15} className={tone} aria-hidden="true" />
                {copy.quality.issueGroups[severity]}
                <span className="font-mono text-[10px] text-[var(--muted)]">
                  {groups[severity].length}
                </span>
              </h4>
              <ul className="space-y-1.5">
                {groups[severity].map((issue, index) => {
                  const target = elementFromPath(issue.path);
                  const message = formatDiagnostic(issue, locale);
                  return (
                    <li
                      key={`${issue.code}:${issue.path ?? ''}:${issue.scope ?? ''}:${index}`}
                      className="flex items-start gap-2 text-xs leading-relaxed text-[var(--muted-strong)]"
                    >
                      <span className="min-w-0 flex-1 break-words">
                        {message}
                        {issue.impact === 'assumption' ||
                        issue.impact === 'simulation-required' ? (
                          <span className="ml-1.5 inline-flex rounded-full border border-[var(--border)] px-1.5 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                            {issue.impact === 'assumption'
                              ? copy.quality.assumptionTag
                              : copy.quality.simulationTag}
                          </span>
                        ) : null}
                      </span>
                      {target ? (
                        <button
                          type="button"
                          onClick={() => focusElement(target)}
                          aria-label={`${copy.semantics.showElement}: ${message}`}
                          className="focus-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]"
                        >
                          <Crosshair size={14} aria-hidden="true" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        },
      )}
    </div>
  );
}
