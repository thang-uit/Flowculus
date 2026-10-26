# Flowculus architecture

## Dependency direction

`apps/web` composes the UI and browser adapters. Packages are pure TypeScript
(no React, Next.js, DOM or storage APIs), so they run unchanged in Web Workers
and in the Vitest Node runner.

```text
apps/web
  -> analysis-engine   -> validation, process-model, formula-renderer
  -> file-formats      -> analysis-engine, graph-layout, process-model
  -> process-mining    -> file-formats, process-model, xml-tree
  -> drawio-adapter    -> process-model, xml-tree
  -> validation        -> process-model
  -> graph-layout, formula-renderer, process-model, xml-tree (leaf packages)
```

`drawio-adapter` and `process-mining` use `validation`/`analysis-engine` only
as dev dependencies in tests.

## Canvas

The canvas is native React Flow (`@xyflow/react`); see
[ADR 0002](adr/0002-native-canvas.md).

- The active `ProcessModel` in the Zustand workspace store is the canvas source
  of truth. Inactive documents retain independent snapshots; switching tabs
  checkpoints the active model, options, source page, history and viewport.
  `lib/canvas-flow.ts` derives React Flow nodes and edges; `ProcessCanvas`
  composes `FlowMarkers`, `CriticalChainLegend`, and the hooks in
  `use-canvas-commands.ts` / `use-canvas-shortcuts.ts`.
- Pointer movement stays inside React Flow. The store is written once per
  gesture through `commitModel`, which records undo history (100 steps).
- `ProcessNodeView` renders `CT`/`T`/`Wq` chips from `activityTimeTerms`
  (with the time source in the tooltip) and a "needs confirmation" badge from
  `unconfirmedNodeCodes`. Critical-chain highlighting preserves BPMN line styles:
  sequence flows and event/gateway outlines stay solid. A quality legend explains
  estimates; message flows and associations retain their distinct semantic strokes.
- `focusElement` in the store selects an element, opens the Inspector and
  centres the canvas on it (used by diagnostics and the semantic review list).

## Documents, device files and shared controls

- `lib/documents/document-store-actions.ts` owns tab identity, activation,
  naming, ordering and closing. Up to 20 open documents each retain a bounded
  100-step undo history in memory. Imports and Mining conversions open new tabs.
- `getWorkspaceDocuments` merges active canvas state with inactive snapshots.
  `documentContentKey` compares the current model, options and draw.io source
  against the last successful file write/download; browser draft status is separate.
- `use-local-draft.ts` serializes debounced writes to IndexedDB with a
  localStorage fallback and a synchronous page-exit checkpoint. Recovery validates
  the session, restores the newest copy and migrates legacy single drafts without
  overwriting edits made during hydration. Web Locks prevents multiple editor
  windows writing the same browser session where supported.
- `lib/documents/device-file.ts` writes `.flowculus.json` after semantic review.
  File System Access handles and opt-in auto-save stay in memory for the current
  session; unsupported browsers receive an explicit download. Cancellation and
  failed writes retain the saved baseline. Edits made during a slow write remain
  dirty. Explicit saving of an inactive tab opens semantic review on that tab
  when necessary; automatic saving never interrupts the current tab.
- Reference photos are separate IndexedDB assets keyed by document ID. They are
  excluded from model files and reports. Closing always asks for confirmation,
  warns about photos and is disabled while writing a file.
- `components/ui` owns shared button, checkbox, menu, context-menu, dialog,
  select and toast primitives. Menus share keyboard/dismissal behavior; selects
  retain listbox semantics. Dialogs trap and restore focus; nested Select Escape
  closes the list before its dialog. Canvas shortcuts do not run behind overlays.
- Tab dragging uses local pointer state and animation-frame transforms, with one
  store commit on release. Touch hold, scrolling, cancellation and keyboard/menu
  alternatives use the same pure ordering function.

## Validation and diagnostics

`@flowculus/validation` returns structured diagnostics
`{ code, severity, impact, scope?, path?, params? }`:

- `validateModelStructure`: schema, dangling edges, time-contract conflicts,
  branch probabilities.
- `validateProcessGraph`: entry resolution (`resolveProcessEntry` never picks
  "the first" of several starts), reachability, gateway checks, unsupported
  elements and gateway kinds.
- The app turns codes into sentences in `lib/diagnostic-messages.ts`, using
  `lib/i18n/diagnostics-en.ts` and `diagnostics-vi.ts`, both typed
  `Record<DiagnosticCode, …>`.

## Semantic confirmation

`semantic-confirmation.ts` owns the policy (see
[ADR 0003](adr/0003-honest-analysis-and-semantic-gate.md)):

- `collectUnconfirmedSemantics(model)` lists inferred node kinds, gateway
  kinds, rework, edge kinds, edge probabilities and unknown kinds.
- `confirmSemantics(model, targets?)` removes the inferred flags and records
  `flowculus-confirmed: true`.
- `checkSemanticGate` / `assertConfirmedModel` and the branded
  `ConfirmedProcessModel` type make the exporter unusable without the gate.
- In the app, `use-workspace-actions` handles export and share;
  `lib/documents/device-file.ts` applies the same policy to device saves.
  A blocked action opens `SemanticGateDialog`; "Review in Inspector"
  opens `SemanticReviewPanel` (per-item confirm, "Confirm all remaining…" behind
  a second step). The Inspector shows a `ConfirmedChip` afterwards.

## Analysis

`analyzeProcess` (`analysis-engine/src/analyze.ts`) orchestrates:

1. `validateModelStructure` and `validateProcessGraph`.
2. `collectActivityTimes` (`activity-diagnostics.ts`): the time contract from
   `resolveActivityTime` (`cycle-time.ts`) with per-activity diagnostics.
3. `resolveBlockStructure` (`structure.ts`): Cooper–Harvey–Kennedy dominators,
   post-dominators with a virtual exit, explicit `flowculus-join-id` first,
   then a proven join with a SESE check and matching gateway kind; otherwise
   the split is unresolved (`simulation-required`). Tarjan SCCs mark cycles.
4. `solveMetric` (`solver.ts`) for CT, TCT, cost and unit load: block rules,
   OR enumeration (independent branches, at most 12), rework, and loops as an
   absorbing Markov-chain fixed point.
5. Formula ASTs (`formula.ts`), CTE (`computeCycleTimeEfficiency`), capacity
   and M/M/c queues (`capacity.ts`, `queue.ts`), CPM (`critical-path.ts`), the
   critical chain (`critical-chain.ts`) and path counts (`path-count.ts`).
6. Quality (`quality.ts`): each diagnostic's impact applies to its scope;
   `metricQuality` is the worst impact per metric and the headline is
   worst(CT, TCT). Values are `null` when `simulation-required`.

The report (`report.ts`) is plain data, so it survives `structuredClone`
between the worker, the store, the UI and every export unchanged
(`report-content.test.ts`).

## Workers

- `workers/analysis.worker.ts` runs `analyzeProcess`. `use-analysis-worker`
  drives it through `createWorkerSupervisor` (`lib/worker-supervisor.ts`):
  latest request wins, a stale request older than 750 ms is cancelled by
  restarting the worker, 20 s timeout, at most 2 consecutive crash restarts,
  then a main-thread fallback.
- `workers/mining.worker.ts` hosts the stateful mining session.
  `useMiningClient` adds a 90 s timeout, `cancel()` and bounded restarts;
  `useMiningSession` maps aborts to a cleared session and a localized message.
- Workers are bundled by webpack (`next build --webpack`); see
  [ADR 0004](adr/0004-webpack-for-module-workers.md).
  `scripts/verify-worker-bundle.mjs` fails the build otherwise.
- `workers/image-trace.worker.ts` loads OpenCV on demand for approximate geometric
  tracing, with bounded 1600 px processing and a 45 s timeout. Arrowhead direction,
  gateway markers and text are not read. Crossings and broken strokes can require
  manual repair; every inferred element must be reviewed before export.

## draw.io interoperability

`@flowculus/drawio-adapter` reads and writes `.drawio` files with
`@flowculus/xml-tree`.

- Import decodes plain, compressed and multi-page files, computes absolute
  bounds through containers, classifies shapes from style (`describeBpmnShape`)
  and flags every guess. Text, images, pools and lanes are presentation only.
- Export patches the source XML. Untouched cells, `UserObject`s, styles,
  pages and waypoints of unmoved flows are kept; the edited page is written
  uncompressed; unconfirmed guesses are not written back. The guarantee is
  semantic preservation (`semantic-preserving.test.ts`), not byte equality.
- `.flowculus.json` optionally stores `drawioPageIndex` alongside the source XML;
  legacy files default to page zero. Edited source pages use the user-chosen model
  name. Page switching discards stale async results after tab switches or edits.

## Process mining

`@flowculus/process-mining` parses CSV/TSV/JSON/XES (`MAX_EVENT_ROWS` =
500,000), builds traces, variants, the DFG and bottlenecks, and converts the
filtered DFG to BPMN (`dfgToProcessModel`) with inferred gateway and
probability flags and structured `MiningConversionWarning`s. The mining view is
split into `MiningSourcePanel`, `MiningFilterPanel`, `MiningMapView` and
`MiningInsightsPanel`, with the actions in `lib/use-mining-session.ts`.

## Exports and reports

`lib/workspace-exports.ts` writes `.drawio`, `.flowculus.json` (with
`createAnalysisSnapshot`, CTE unit `ratio`), nodes/edges CSV (with
`effective_cycle_time_minutes` and `cycle_time_source`), SVG, PNG and JPEG
(rendered from the model), the PDF report (`print-report.ts`) and the image
report (`report-image.ts`). Both reports read `buildReportContent`
(`report-content.ts`), so they show the same metric qualities, findings and
per-activity time sources as the UI. Data exports can run without analysis;
generated analysis reports require a current result. Device saves omit derived
analysis and recalculate it when opened.

## Resilience

`SectionErrorBoundary` wraps the canvas, mining view, analysis dock and
Inspector with a retry. The status bar shows worker states (restarting,
timeout, main-thread fallback) and an offline badge (`use-online-status`).

## Naming

- React components: `PascalCase.tsx`; hooks: `use-kebab-case.ts` exporting
  `useX`; other modules: `kebab-case.ts`.
- Types `PascalCase`, functions `camelCase`, module invariants
  `UPPER_SNAKE_CASE`, CSS variables semantic kebab-case.
