'use client';

import { GatewayMarker } from '@/components/bpmn/GatewayMarker';
import { useId } from 'react';

import { getReadingCopy } from '@/lib/i18n/knowledge/copy';
import type { DiagramKind } from '@/lib/knowledge/types';
import { usePreferencesStore } from '@/lib/use-preferences-store';

/** Semantic SVG diagrams remain sharp and theme-aware without an image runtime. */
export function ProcessFigure({
  diagram,
  caption,
}: Readonly<{ diagram: DiagramKind; caption: string }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getReadingCopy(locale);
  const markerId = `flow-${useId().replace(/:/g, '')}`;
  const arrow = `url(#${markerId})`;
  const connector = (d: string, dashed = false) => (
    <path
      d={d}
      fill="none"
      stroke="var(--muted)"
      strokeWidth="1.8"
      markerEnd={arrow}
      strokeDasharray={dashed ? '5 5' : undefined}
    />
  );
  const task = (x: number, y: number, label: string, accent = false) => (
    <g>
      <rect
        x={x - 62}
        y={y - 24}
        width="124"
        height="48"
        rx="10"
        fill={accent ? 'var(--accent-soft)' : 'var(--surface)'}
        stroke={accent ? 'var(--accent-strong)' : 'var(--border-strong)'}
        strokeWidth="1.5"
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fill="var(--text)"
        fontSize="12"
        fontWeight="600"
      >
        {label}
      </text>
    </g>
  );
  const gateway = (x: number, y: number, symbol: string) => (
    <g>
      <path
        d={`M${x} ${y - 20}l20 20-20 20-20-20Z`}
        fill="var(--accent-soft)"
        stroke="var(--accent-strong)"
        strokeWidth="1.5"
      />
      <g
        transform={`translate(${x - 20} ${y - 20}) scale(0.4)`}
        color="var(--accent-strong)"
      >
        <GatewayMarker kind={symbol === '+' ? 'and' : 'xor'} />
      </g>
    </g>
  );
  const terminal = (x: number, label: string, end = false) => (
    <g>
      <circle
        cx={x}
        cy="120"
        r="17"
        fill="var(--surface)"
        stroke="var(--muted-strong)"
        strokeWidth={end ? 3 : 1.5}
      />
      <text x={x} y="157" textAnchor="middle" fill="var(--muted-strong)" fontSize="11">
        {label}
      </text>
    </g>
  );

  return (
    <figure className="knowledge-figure">
      <div
        className="knowledge-figure-scroll"
        role="region"
        aria-label={caption}
        tabIndex={0}
      >
        <svg
          viewBox="0 0 720 230"
          role="img"
          aria-label={caption}
          className="knowledge-process-figure"
        >
          <defs>
            <marker
              id={markerId}
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
            >
              <path d="M0 0L7 3.5L0 7Z" fill="var(--muted)" />
            </marker>
          </defs>
          {diagram === 'mining' ? (
            <>
              {connector('M242 65H458')}
              {connector('M242 170H458')}
              {connector('M180 89V110H520V145', true)}
              {task(180, 65, copy.diagramLabels.log, true)}
              {task(520, 65, copy.diagramLabels.discover)}
              {task(180, 170, copy.diagramLabels.compare)}
              {task(520, 170, copy.diagramLabels.replay, true)}
            </>
          ) : (
            <>
              {terminal(40, copy.diagramLabels.start)}
              {terminal(680, copy.diagramLabels.end, true)}
              {diagram === 'request' ? (
                <>
                  {connector('M58 120H82')}
                  {connector('M207 120H239')}
                  {connector('M280 120H300V55H348')}
                  {connector('M280 120H300V185H348')}
                  {connector('M472 55H590V100')}
                  {connector('M472 185H590V140')}
                  {connector('M610 120H660')}
                  {task(145, 120, `18 ${copy.minutes}`)}
                  {gateway(260, 120, '×')}
                  {task(410, 55, `A · 24 ${copy.minutes}`, true)}
                  {task(410, 185, `B · 7 ${copy.minutes}`)}
                  {gateway(590, 120, '×')}
                  <text x="302" y="43" fill="var(--muted-strong)" fontSize="11">
                    p = {locale === 'vi' ? '0,6' : '0.6'}
                  </text>
                  <text x="302" y="209" fill="var(--muted-strong)" fontSize="11">
                    p = {locale === 'vi' ? '0,4' : '0.4'}
                  </text>
                </>
              ) : diagram === 'sequence' ? (
                <>
                  {connector('M58 120H178')}
                  {connector('M302 120H418')}
                  {connector('M542 120H660')}
                  {task(240, 120, 'A')}
                  {task(480, 120, 'B', true)}
                </>
              ) : diagram === 'xor' || diagram === 'and' ? (
                <>
                  {connector('M58 120H139')}
                  {connector('M180 120H210V55H288')}
                  {connector('M180 120H210V185H288')}
                  {connector('M412 55H530V100')}
                  {connector('M412 185H530V140')}
                  {connector('M550 120H660')}
                  {gateway(160, 120, diagram === 'and' ? '+' : '×')}
                  {gateway(530, 120, diagram === 'and' ? '+' : '×')}
                  {task(350, 55, 'A', true)}
                  {task(350, 185, 'B')}
                </>
              ) : diagram === 'rework-once' ? (
                <>
                  {connector('M58 120H108')}
                  {connector('M232 120H279')}
                  {connector('M320 120H340V55H378')}
                  {connector('M502 55H560V99')}
                  {connector('M320 120H539')}
                  {connector('M580 120H660')}
                  {task(170, 120, 'A', true)}
                  {gateway(300, 120, '×')}
                  {task(440, 55, copy.diagramLabels.redo)}
                  {gateway(560, 120, '×')}
                  <text x="350" y="42" fill="var(--muted-strong)" fontSize="11">
                    r
                  </text>
                  <text x="420" y="143" fill="var(--muted-strong)" fontSize="11">
                    1 − r
                  </text>
                </>
              ) : (
                <>
                  {connector('M58 120H178')}
                  {connector('M302 120H459')}
                  {connector('M500 120H660')}
                  {connector('M480 99V40H240V94')}
                  {task(240, 120, 'A', true)}
                  {gateway(480, 120, '×')}
                  <text x="355" y="31" fill="var(--muted-strong)" fontSize="11">
                    r
                  </text>
                  <text x="572" y="143" fill="var(--muted-strong)" fontSize="11">
                    1 − r
                  </text>
                </>
              )}
            </>
          )}
        </svg>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
