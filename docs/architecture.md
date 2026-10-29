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
  -> bpmn-adapter      -> validation, process-model, xml-tree
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
- `canvas-inspector.ts` opens the Inspector on explicit node/edge clicks,
  including a second click after dismissing the same selection. Transient drag
  and marquee selection, modifier clicks and Pan remain passive. Quick actions,
  inline fields and routing handles retain their own interaction handlers.
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
- The incumbent visual authority is `app/globals.css`: yellow accent and neutral
  light/dark surfaces, self-hosted Plus Jakarta Sans, compact operational controls.
  `AppButton`, `AppSelect` and `AppDialog` own shared variants, listbox and modal
  behavior; feature code supplies domain content. Knowledge equations use native
  MathML through `KnowledgeMath`, with prose and a separate text-copy action.
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
  `useMiningSession` and `mining-conformance.ts` clear the session after worker
  loss and localize the failure. Conformance has a separate latest-request ticket,
  binds its result to the original discovery and an unchanged open reference, and clears previous evidence while
  a new comparison runs. Replacement uploads disable reference comparisons.
- `workers/xlsx-log.worker.ts` extracts only the first worksheet, with a 10 MB
  file limit; cancelled extraction terminates its worker.
- `workers/comparison.worker.ts` runs `compareProcessScenarios` for two confirmed
  documents and their analysis options. `ScenarioComparison` cancels on selection
  changes/close, times out after 20 s and hides results invalidated by later edits.
- Workers are bundled by webpack (`next build --webpack`); see
  [ADR 0004](adr/0004-webpack-for-module-workers.md).
  `apps/web/scripts/verify-worker-bundle.mjs` requires all five bundled workers
  and rejects raw worker source assets.
- `workers/image-trace.worker.ts` loads OpenCV on demand for approximate geometric
  tracing, with bounded 1600 px processing and a 45 s timeout. Arrowhead direction,
  gateway markers and general text are not read. The duration detector accepts
  one complete printed integer-hour label (`0h` through `10000h`) per task, retains
  punctuation to reject decimal/negative labels, and never uses a numeric suffix
  from a longer label. Its visited buffer covers only the task region, without a
  second copy of each connected component's pixels. Manual duration edits discard
  the original recognition-confidence marker. Crossings and broken strokes can
  require manual repair. Every inferred element must be reviewed before export.

## draw.io interoperability

`@flowculus/drawio-adapter` reads and writes `.drawio` files with
`@flowculus/xml-tree`.

- Import decodes plain, compressed and multi-page files, computes absolute
  bounds through containers, classifies shapes from style (`describeBpmnShape`)
  and flags every guess. Text and images remain presentation only. Flowculus
  container metadata restores pool/lane records and node membership; other draw.io
  containers remain preserved in the source XML.
- Export patches the source XML. Untouched cells, `UserObject`s, styles,
  pages and waypoints of unmoved flows are kept; the edited page is written
  uncompressed; unconfirmed guesses are not written back. The guarantee is
  semantic preservation (`semantic-preserving.test.ts`), not byte equality.
- `.flowculus.json` optionally stores `drawioPageIndex` alongside the source XML;
  legacy files default to page zero. Edited source pages use the user-chosen model
  name. Missing native bounds are restored from the selected source page without
  changing explicit coordinates. `documents/drawio-page-transition.ts` patches the
  current page before decoding another and checks the originating revision and
  document identity. Leaving and returning to the same tab also cancels stale work.

## Process mining

`@flowculus/process-mining` parses CSV/TSV/JSON/XES (`MAX_EVENT_ROWS` =
500,000), builds traces, variants, the DFG and bottlenecks, and converts the
filtered DFG to BPMN (`dfgToProcessModel`) with inferred gateway and
probability flags and structured `MiningConversionWarning`s. The mining view is
split into `MiningSourcePanel`, `MiningFilterPanel`, `MiningMapView` and
`MiningInsightsPanel`, with the actions in `lib/use-mining-session.ts`.

Standards comparisons render 50 activity/resource rows per page in
`StandardsResults`, with access to every group and localized numeric formatting.
Missing start timestamps are counted once per log, including blank starts in
partially timed logs. Mining JSON includes graph filters, hidden element counts
and missing-start counts so filtered graph evidence is distinguishable from full-log statistics.

## Exports and reports

`lib/workspace-exports.ts` writes `.bpmn`, `.drawio`, `.flowculus.json` (with
`createAnalysisSnapshot`, CTE unit `ratio`), nodes/edges CSV (with
`effective_cycle_time_minutes` and `cycle_time_source`), SVG, PNG and JPEG
(rendered from the model), the PDF report (`print-report.ts`) and the image
report (`report-image.ts`). Both reports read `buildReportContent`
(`report-content.ts`), so they show the same metric qualities, findings and
per-activity time sources as the UI. Data exports can run without analysis;
generated analysis reports require a current result. Device saves omit derived
analysis and recalculate it when opened. Manual export/share commit pending fields.
Inspector outside dismissal commits before hiding the panel and keeps invalid
fields visible so Save/Export cannot bypass them as inert content.

`report-image-layout.ts` bounds report images to 1600 × 5000 pixels (8 MP) and
200,000 text characters. It reserves space for wrapped titles, every diagnostic
and the footer before allocating the report canvas. Unbroken labels wrap at
Unicode code-point boundaries. Oversized reports produce a localized PDF/native
JSON suggestion instead of clipping diagnostics or allocating an unbounded bitmap.

## Resilience

`SectionErrorBoundary` wraps the canvas, mining view, analysis dock and
Inspector with a retry. The status bar shows worker states (restarting,
timeout, main-thread fallback) and an offline badge (`use-online-status`).

## Naming

- React components: `PascalCase.tsx`; hooks: `use-kebab-case.ts` exporting
  `useX`; other modules: `kebab-case.ts`.
- Types `PascalCase`, functions `camelCase`, module invariants
  `UPPER_SNAKE_CASE`, CSS variables semantic kebab-case.

## Collaboration and portable BPMN

Container drag completion distinguishes parent-pool translation from a lane reorder,
including a lane used as the drag anchor in a parent selection. Mixed lane/task
reorders are rejected atomically rather than discarding part of a selection.
Resizing validates affected frames and contents, so a small imported frame in an
unrelated pool cannot block the selected edit. Inspector number fields can reject
a domain commit and keep an inline invalid state instead of displaying an unapplied
dimension as though it had succeeded.

Version-2 ProcessModel adds serialisable container records independently of executable nodes. Pool/Lane membership survives native JSON, clipboard, CSV metadata and draw.io container metadata; v1 documents remain readable. React Flow uses relative parent coordinates, while the domain retains absolute bounds. A drag commits once; invalid cross-pool sequence changes are rejected atomically. Pool/lane resize, lane ordering, keyboard nudge and clipboard edits preserve membership. The shape palette shares Pool/Lane tools for click and HTML5 drop. Lane title drags snap to sibling order without changing task inputs. Inline naming and ContainerInspector reuse the same pure edits. Delete/Backspace and cut cascade through selected frame contents, while the separate manager action removes only the frame. Pool resize and trailing lane dividers update adjacent boundaries atomically and refuse clipping. Interrupted or stale drag/resize gestures restore the model without history. Free tasks can enter/leave frames, but cross-pool sequence flow is rejected and incomplete memberships block scoped analysis.

Analysis selects a single process through `scopeProcessModel` and `processPoolId`; it never sums participant durations. BPMN message flows are excluded from control flow. `bpmn-adapter` reads bounded namespace-aware BPMN XML and DI, rejects declarations/unsupported execution semantics and writes standard BPMN with namespaced time/probability extensions. Its exporter asserts semantic confirmation. This is a BPMN subset, not a full workflow execution engine.

## Petri evidence and model conformance

`process-mining/src/petri` owns net types, firing, Alpha/BPMN-to-Petri conversion, footprint, reachability, PNML export, trace alignment and quality variants. `alignment-conformance.ts` aggregates log/reference results; `performance-standards.ts` owns service-standard parsing and comparison. The UI draws from the same net used by the runtime. Verification distinguishes successful final markings from erroneous deadlocks; a truncated search returns inconclusive rather than a proof. Reachability explores at most 2,000 markings by default and cuts off token growth above 32 per place. These workflow completion checks do not provide general liveness/invariants or business-correctness proofs.

The mining worker caches Alpha evidence per log and reuses prepared traces/statistics while filters change under the same time policy. Reference checks return bounded optimal unit-cost alignment and Petri verification. Service-standard comparison uses a separate request. The older token-replay API remains available in the domain package for compatibility, but the UI does not run or store its unused payload. Reference identity, process scope and activity mapping are explicit. `ActivityMappingEditor` searches the full log vocabulary while mounting at most 100 matching rows. BPMN-to-Petri supports a narrower XOR/AND subset than analytical CT; unsupported message/OR/parameter-rework semantics withhold conformance. Fitness uses the stated alignment normalisation; prefix precision and transition-frequency generalization use only exactly compatible cases with disclosed coverage. Simplicity uses mean arc degree. Partial analysis withholds conclusions. JSON evidence exports derived results; event logs remain a separate explicit download. PNML import, arbitrary Petri-to-BPMN conversion, log-vs-log comparison and BPR tagging are not implemented. Mining supports fixed-offset working calendars with weekday, shift and holiday configuration. Daylight-saving rules and per-resource calendars are not implemented.

`comparison.worker.ts` runs two analytical model scenarios off the main thread. All five workers are verified by the build script. Model comparison is distinct from measured pre/post intervention effects. Data for the project demonstration is generated outside the app by `pnpm demo:export`; fixtures used to verify generation are test-only, with no project-specific runtime preset. Expected metrics come from the same engine plus explicit scenario assertions, not independent PM4Py validation. Validating the generated BPMN against the OMG XML schema checks its structure, not full execution conformance.

## Source and cache hygiene

Every declared runtime dependency has a source import or framework configuration use. TypeScript checks unused imports, locals and parameters across the workspace. Public package exports and draft migrations are preserved even when they have no direct UI caller.

`pnpm clean:cache` removes a fixed list of generated paths: Turbo/Next/Vitest caches, TypeScript incremental files, `.tmp`, local Playwright captures and `.impeccable/review`. It does not traverse arbitrary user-supplied paths. Installed dependencies, production output, exported demo kits, the GitNexus index and browser drafts remain available. Stop local servers first. The next build or development run regenerates its caches.

Current instructions belong in README, this architecture guide, accepted ADRs and the relevant surface description. Completed one-off audit notes are not kept as competing instructions. Demo generation remains documented separately in `report-study-guide.md`.

### Connected device files

Native file opening uses the File System Access picker when available. Parsed
`.flowculus.json` inputs retain their source handle, including supported drops.
Converted BPMN/draw.io/CSV inputs never bind for native JSON writes. All import
entry points share cancellation from selection through parsing and application.

Device capabilities are separate from models: browser access, connection registry,
optional IndexedDB structured-clone storage and save orchestration have focused
modules under `lib/documents/`. Handles are absent from JSON exports and
localStorage. Reload restores connections with session-only auto-save disabled.
Explicit saves may request write permission. Automatic saves only query it.
SHA-256 fingerprints detect changed file contents before writes. Web Locks
serialize same-named Flowculus file writes across windows when available. These
checks cannot lock external applications between verification and disk commit.
Failures/cancellation retain the dirty baseline. Closing removes the connection,
and pending hydration cannot resurrect it. Save As intentionally chooses a new
target, while Save and close updates an existing connection.

### Manual input and automatic-save boundaries

Manual saves flush the active inspector field before capturing the document and
stop at a visible invalid field. Numeric controls preserve the full stored value
when focus/blur happens without typing, even if the displayed value is rounded.
Device auto-save owns a separate subscription from locale-sensitive keyboard and
open handlers. Disabling it cancels a scheduled write at execution time as well.
Failures disable it before publishing the error state, so state subscribers cannot
accidentally schedule another write. Import completion feedback uses the current
locale. Failed draft queues release ownership on both outcomes without creating
an unhandled promise rejection.
