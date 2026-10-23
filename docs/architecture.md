# Flowculus architecture

## Dependency direction

`apps/web` composes the UI and application use cases. It may depend on the domain packages. Domain packages must not import React, Next.js or browser-only APIs, so they run unchanged in Web Workers and in the Node test runner.

```text
apps/web
  -> process-model      (types, default node sizes, bounds)
  -> validation         (schemas, graph checks)
  -> analysis-engine    (flow equations, CPM, critical chain, capacity, queues)
  -> formula-renderer   (formula AST formatting)
  -> drawio-adapter     -> process-model, xml-tree
  -> file-formats       -> process-model, graph-layout
  -> process-mining     -> process-model, file-formats, xml-tree
  -> graph-layout       (pure geometry, no domain imports)
xml-tree                (no dependencies)
```

## Canvas

The canvas is a native React Flow (`@xyflow/react`) surface; see [ADR 0002](adr/0002-native-canvas.md).

- `ProcessModel` in the workspace store is the single source of truth. `lib/canvas-flow.ts` derives React Flow nodes and edges from it; `ProcessCanvas` syncs them with the derived-state pattern and keeps React Flow's measured sizes (`mergeMeasuredNodes`).
- Pointer movement stays inside React Flow. The store is written once per gesture – drag stop, connect, delete, drop, quick action – through `commitModel`, which also records undo/redo history (100 steps).
- Drops use `screenToFlowPosition`, and `addNodeAt` centres the new node on that point, so a shape lands exactly under the pointer at any zoom or pan.
- Custom node views (`ProcessNodeView`) render BPMN tasks with `T`/`Wq`/rate/rework chips, diamond gateways with glyphs, events, data objects and annotations. Handles have a 28 px hit area and `connectionRadius` is 36 px.
- `SequenceFlowEdge` routes each flow with `@flowculus/graph-layout` (`routeOrthogonalEdge`) using the committed node bounds as obstacles, and shows the branch label and probability. The critical chain is highlighted and, unless the user prefers reduced motion, animated.
- `lib/model-editing.ts` holds the pure editing commands (add, move, connect, remove, append after, change kind, confirm inferred semantics, rebalance XOR probabilities). It is unit-tested without a DOM.

## draw.io interoperability

`@flowculus/drawio-adapter` reads and writes `.drawio` files with the DOM-free `@flowculus/xml-tree`.

- **Import** decodes plain, compressed (deflate-raw + base64 + URI) and multi-page files. A page that cannot be decoded only fails when it is opened. Absolute bounds are computed through parent containers. Shapes without `flowculus-*` metadata are classified from their draw.io style and flagged as inferred; the analysis reports an assumption until the user confirms them.
- **Export** patches the source XML instead of regenerating it. Only geometry of moved nodes, changed labels, `flowculus-*` attributes, added cells and deleted cells change. Unknown cells, styles, pages and comments are preserved. Without a source file a fresh `mxfile` with native BPMN styles is created.
- The round trip is covered by Vitest (`packages/drawio-adapter/src/index.test.ts`).

## Analysis

The analysis worker receives a serializable process model and returns a serializable report. React components render the report but do not own formulas. A synchronous fallback is used only when the browser blocks module workers; `use-analysis-worker` ignores stale request IDs.

- Block-structured equations: sequence sum, XOR probability-weighted sum, AND max for elapsed time (sum for cost and unit load), and rework as a fixed point of expected visits. A task-level rework probability applies only to that task.
- OR is evaluated only under explicit independent-branch assumptions. Complex, event-based or unstructured graphs return diagnostics and `simulation-required` instead of an unqualified number.
- CPM is exposed for decision-free acyclic graphs. `analyzeCriticalChain` follows the dominant branch through decisions and loops and labels the result `assumption` (`basis: 'dominant-branch'`).
- Capacity reports compute utilisation per resource pool and an M/M/c queue (Erlang-C) with μ = 60 / unit load. `littleLawForecast` derives WIP = λ × CT from the scenario arrival rate.
- `countProcessPaths` is a bounded graph query used by `PathQueryPanel`.

`ScenarioSettings` writes committed operating assumptions (`AnalysisOptions`) to the store. The same options travel with the worker request, the IndexedDB draft and the Flowculus JSON export.

## Process mining

`@flowculus/process-mining` is pure TypeScript:

- `parseEventTable` reads CSV (delimiter detection), JSON (array, `events`, or `cases`) and IEEE XES. `suggestColumnMapping` recognises English, XES and Vietnamese headers. `buildEventLog` pairs lifecycle start/complete events and reads zone-less timestamps as UTC.
- `discoverProcess` builds traces, variants, the directly-follows graph (DFG), log statistics and bottlenecks. `filterDirectlyFollowsGraph` projects activities and keeps the strongest edges so the map stays connected.
- `dfgToProcessModel` converts the filtered DFG into BPMN: XOR split/join gateways with normalised probabilities (flagged inferred), self-loops as task rework, and warnings for possibly parallel pairs or missing start times. The result is laid out with `withAutoLayout`.
- `MINING_PRESETS` generates seeded, reproducible sample logs.

In the web app, `lib/mining-engine.ts` wraps the package as a stateful session (load preset, inspect file, apply mapping, discover, to model, export log). `workers/mining.worker.ts` hosts it off the main thread; `use-mining-client` falls back to running the same session synchronously.

## Exports

`lib/workspace-exports.ts` is the single entry point for export formats: `.drawio` (patch export), `.flowculus.json`, nodes/edges CSV, SVG, PNG/JPEG, PDF report and PNG/JPEG report. Diagram images are rendered from the model by `processModelToSvg` (`file-formats`), not screenshotted from the DOM, so they are crisp and theme-aware; raster formats rasterise that SVG at 2–3×.

Presentation-only adapters stay in `apps/web`: `localize-analysis.ts` maps stable engine diagnostics to the selected locale, `print-report.ts` builds the PDF print view and `report-image.ts` composes the shareable image report.

## Naming

- React components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts` with a `useX` export
- Domain functions: `camelCase`
- Types: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` only for true module constants
- CSS variables: semantic kebab-case names

## Performance boundaries

- Pointer movement stays inside React Flow; the store holds committed model changes, never drag frames.
- Node views are memoised; edge routing reads committed bounds, not live drag positions.
- Parsing, validation, analysis and mining are worker-ready pure functions.
- Large files belong in IndexedDB, not localStorage. `use-local-draft` restores and debounces one browser-local draft.
- The image-recognition boundary is deliberately not faked: a future vision adapter must return a confidence-scored draft that the user confirms before semantic metadata is committed.
