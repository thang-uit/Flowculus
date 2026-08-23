# Flowculus architecture

## Dependency direction

`apps/web` composes the UI and application use cases. It may depend on the domain packages. Domain packages must not import React, Next.js, browser APIs, or draw.io implementation details.

```text
apps/web
  -> process-model
  -> validation
  -> analysis-engine
  -> formula-renderer
  -> drawio-adapter
  -> file-formats
```

The native draw.io iframe is mounted by `DrawioCanvas`. Its protocol is origin-checked and limited to load/autosave/save/export/fit/zoom actions. The iframe owns pointer movement, pan/zoom, shape routing and undo/redo; React receives only committed XML and semantic JSON snapshots. Flowculus inserts semantic palette shapes as native vertices before handing the XML back to draw.io. Custom `flowculus-*` attributes are the metadata bridge that keeps a file openable in diagrams.net. The local palette supports click and drag/drop insertion, while native draw.io remains the source of truth for the complete stencil library.

The first analysis mode follows the book's block-structured flow equations: sequence sum, XOR probability-weighted sum, AND max for elapsed time (sum for cost/unit load), and rework fixed-point evaluation. A task-level rework probability applies only to that task body, so the continuation after the task is not multiplied by the geometric-series factor. OR is evaluated only under explicit independent-branch assumptions. Complex/event-based/unstructured graphs return diagnostics and a simulation recommendation instead of an unqualified number. Critical Path Method is exposed separately for decision-free, acyclic graphs and uses processing time, while capacity reports identify the minimum-capacity bottleneck pool.

`countProcessPaths` is a separate bounded graph query. It counts edge-distinct sequence-flow routes and accepts an optional source/target set for sub-process questions (for example `n1 → n8`). It detects cycles and caps path explosion, returning an explicit status rather than blocking the worker.

The web layer exposes that query in `PathQueryPanel` as local, read-only state. A failed or slow cross-origin editor handshake falls back to `FallbackCanvasPreview`, a bounded SVG projection of the semantic model; it never replaces the native draw.io XML source of truth or changes the import/export contract.

The analysis worker receives a serializable process model and returns a serializable report. React components render that report but do not own cycle-time formulas. A synchronous fallback is used only when the browser blocks module workers.

`ScenarioSettings` writes only committed operating assumptions (`AnalysisOptions`) to the workspace store. The same options travel with the worker request, local IndexedDB draft and Flowculus JSON export. This keeps Little's Law, capacity and M/M/c queue calculations in the domain boundary instead of duplicating formulas in React.

Presentation-only adapters stay in `apps/web`: `localize-analysis.ts` maps stable engine diagnostics to the selected locale, `print-report.ts` creates the PDF print view, and `report-image.ts` composes a shareable PNG/JPEG report in an off-screen canvas. These adapters do not alter the worker's locale-neutral domain calculations.

## Naming

- React components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts` with a `useX` export
- Domain functions: `camelCase`
- Types: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` only for true module constants
- CSS variables: semantic kebab-case names

## Performance boundaries

- draw.io pointer movement stays inside its canvas boundary.
- React state stores intent and committed model changes, not pointer coordinates.
- Parsing, validation and analysis are worker-ready pure functions.
- Large files belong in IndexedDB, not localStorage.
- `use-local-draft` restores and debounces one browser-local draft; localStorage is used only as a compatibility fallback when IndexedDB is unavailable.
- `use-analysis-worker` ignores stale request IDs so an older calculation cannot overwrite a newer graph.
- The image-recognition boundary is deliberately not faked: a future vision adapter must return a confidence-scored draft that the user confirms before semantic metadata is committed.
