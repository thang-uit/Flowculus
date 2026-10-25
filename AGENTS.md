# Flowculus agent rules

These rules are binding for every human or AI contributor working in this
repository. They describe the code as it is; if a rule and the code disagree,
fix one of them in the same change.

## 1. Scope and product principles

- Flowculus is a browser-first, zero-backend workspace for BPMN-subset process
  modelling, process mining and cycle-time analysis. Models, logs and results
  never leave the browser.
- Results must be honest. Every number carries a quality (`exact`,
  `assumption` or `simulation-required`) and the findings that explain it. When
  a value cannot be derived analytically it is withheld (`null`), never
  guessed.
- A guess is never shared as a fact: inferred semantics block export and share
  until a person confirms them (section 5).
- The canvas stays fast on low-end phones; correctness beats decoration.

## 2. Package ownership and dependency direction

```text
apps/web            composition, presentation, browser adapters, workers
  -> analysis-engine   -> validation, process-model, formula-renderer
  -> file-formats      -> analysis-engine, graph-layout, process-model
  -> process-mining    -> file-formats, process-model, xml-tree
  -> drawio-adapter    -> process-model, xml-tree
  -> validation        -> process-model
  -> graph-layout, formula-renderer, process-model, xml-tree (no internal deps)
```

- Dependencies point from `apps/web` to packages and between packages only in
  the direction above. No cycles; never import `apps/web` from a package.
- Packages are pure TypeScript: no React, Next.js, DOM, `window`, CSS or
  storage APIs. They must run unchanged in a Web Worker and in Vitest (Node).
- Ownership:
  - `process-model`: serializable domain types, metadata keys
    (`SEMANTIC_METADATA_KEYS`), node-kind helpers.
  - `validation`: zod schema, structured diagnostics (`DIAGNOSTIC_CODES`),
    graph checks (`validateProcessGraph`), the semantic confirmation policy.
  - `analysis-engine`: every formula (CT, TCT, CTE, cost, rework, OR, CPM,
    critical chain, capacity, M/M/c, Little's Law), block-structure proofs
    (dominators/post-dominators) and quality.
  - `formula-renderer`: formula AST and text/LaTeX-like formatting.
  - `drawio-adapter`: the draw.io protocol (decode, classify, patch export).
  - `file-formats`: `.flowculus.json`, CSV, SVG rendering, auto layout.
  - `process-mining`: event-log parsing, DFG, variants, bottlenecks,
    resource handoff centrality, classical Alpha Miner/Petri candidates,
    bounded conformance replay against the current BPMN model, DFG → BPMN
    conversion.
  - `graph-layout`, `xml-tree`: dependency-free geometry and XML.

## 3. Naming, files and component boundaries

- Components: `PascalCase.tsx`, one exported component per file plus small
  private helpers. Hooks: `use-kebab-case.ts` exporting `useX`. Other modules:
  `kebab-case.ts`. Types: `PascalCase`. Module invariants: `UPPER_SNAKE_CASE`.
- Use domain names (`cycleTimeSource`, `joinBySplitId`), never `data`,
  `helper`, `misc`, `utils2`.
- Keep files focused; split a file when it mixes responsibilities or grows past
  roughly 300 lines (tests and static data excepted).
- Workspace and page components only compose. Business rules live in packages,
  browser side effects in `apps/web/lib` hooks/services, presentation in
  `apps/web/components/<feature>/`. Shared primitives live in
  `apps/web/components/ui`.
- No `any` without a comment explaining why. Do not swallow errors: keep the
  root cause and surface a useful state.

## 4. Domain formula ownership

- Formulas exist only in `packages/analysis-engine`. UI, export and report
  code render `AnalysisReport`; they never recompute a metric.
- Activity time contract (one helper: `resolveActivityTime`):
  - observed cycle time `D` (`durationMinutes`) wins;
  - otherwise `CT = T + Wq` (derived);
  - `T + Wq > D` is an error; `T + Wq < D` is an `unexplained-wait`
    assumption.
  - Every activity exposes `cycleTimeSource` and `processingSource`; show them
    in the Inspector, canvas chips, CSV, PDF and image reports.
- CTE is a ratio in `[0, 1]`. Only formatters (`formatPercent`) multiply by 100. Zero or invalid inputs produce `null` plus a diagnostic.
- CPM (processing time, decision-free acyclic graphs) and the cycle-time
  critical chain are different results with different names. CPM falls back to
  `D` for missing `T` only as an `assumption` and names the tasks.
- Joins are resolved from explicit `flowculus-join-id` metadata first, then
  proven with post-dominators and a SESE check. If a join cannot be proven, the
  result is `simulation-required`; never pick "the first" start, join or path.
- Any change to a formula updates `formula-groups.test.ts`,
  `structure.test.ts` or `cycle-time.test.ts`, and the pinned numbers in
  `report-example.test.ts`, `initial-process-model.test.ts` and
  `process-mining/src/regression.test.ts` must stay identical unless the change
  is an intended correction that is documented in the README changelog.

## 5. Validation, quality and semantic confirmation

- Validation returns structured diagnostics `{ code, severity, impact, scope,
path, params }`. Packages never return user-facing sentences; the web app
  maps codes to English and Vietnamese in `lib/i18n/diagnostics-*.ts` (typed as
  `Record<DiagnosticCode, …>`, so a missing translation fails the type check).
- Adapters (draw.io, CSV, mining) flag every guess with `flowculus-inferred-*`
  metadata. `collectUnconfirmedSemantics` is the single source of truth.
- Export and share go through one app-level guard (`use-workspace-actions`)
  and the low-level exporter only accepts a `ConfirmedProcessModel` and
  re-checks it (`assertConfirmedModel`). Never add an export path that skips
  both. Editing, analysis and the local draft keep working while blocked.
- Confirming records `flowculus-confirmed: true` and removes the inferred
  flags. Unknown node kinds cannot be confirmed; the person must pick a type.

## 6. draw.io preservation and export rules

- draw.io is a file format, not a runtime. There is no iframe.
- Export patches the source XML: untouched cells, styles, pages (including
  compressed ones), unknown `UserObject`s and waypoints of unmoved flows are
  kept. The edited page is written uncompressed. Do not claim byte-for-byte
  lossless output; the guarantee is semantic preservation, covered by
  `semantic-preserving.test.ts`.
- Unconfirmed guesses are never written back as explicit `flowculus-*`
  attributes. Confirmed semantics and explicit join pairing are.

## 7. i18n, accessibility and responsive rules

- English is the default locale. Every visible string has English and
  Vietnamese values under `apps/web/lib/i18n/`. No string literals in JSX.
- Every interactive element has an accessible name, a visible focus state and
  keyboard support (menus: arrows/Home/End/Escape; dialogs: focus trap and
  return focus). Quality is never shown by colour alone.
- Layouts must work at 320, 390, 430, 768, 1024, 1440 and 1920 px. Use `dvh`,
  never `h-screen`. Mobile actions stay reachable through the compact toolbar
  and bottom sheet. Respect `prefers-reduced-motion`; animate only `transform`
  and `opacity`.

- Preserve BPMN semantic line styles when highlighting analysis: event/gateway
  outlines and sequence flows remain solid; use the quality legend rather than
  dashed semantic strokes. Message flows and associations keep their own line
  styles. Shared gateway marker geometry lives in `process-model/bpmn-symbols`;
  palette, canvas, lessons and SVG must use it. Re-capture demo images after
  visible editor changes, including each documented locale and theme.

## 8. Performance, workers and persistence

- Analysis runs in `workers/analysis.worker.ts` under `createWorkerSupervisor`
  (latest request wins, cancellation of stale long runs, timeout, bounded
  restart, main-thread fallback only when workers cannot run).
- Mining runs in `workers/mining.worker.ts` through `useMiningClient`
  (timeout, cancel, bounded restart). The worker holds the log, so an abort
  clears the mining session.
- XLSX extraction runs in `workers/xlsx-log.worker.ts` on the first worksheet
  only, with a 10 MB file limit. Mining conformance must use the current
  confirmed BPMN model as its reference; the graph discovered from the log
  is not a normative reference. Unsupported semantics or exceeded replay
  bounds must withhold a conformance score.
- Image Trace runs OpenCV.js only in `workers/image-trace.worker.ts`, loaded on
  demand. Bound source images to 20 MB and 100 megapixels, downsample processing
  to 1600 px, terminate after 45 seconds or on cancel, and release every Mat.
  The reference photo is a separate IndexedDB asset, never a ProcessModel field
  or implicit export payload. Inferred nodes and flows require semantic review.
  Await the OpenCV runtime before calling Mat APIs. A visible canvas toolbar must
  expose image settings/removal at every viewport. Removal/replacement checkpoints
  invalidate stale persisted photos, pending decodes and detection results.
- Explicit edge attachment sides are optional presentation fields (`routing.sourceSide`,
  `routing.targetSide`); absent means automatic. Cardinal ports must survive JSON,
  CSV, clipboard, drafts and native draw.io entry/exit constraints. Geometry-only
  reattachment must preserve probabilities and waypoints. Invalid/cancelled drops
  keep the original edge; completed pointer gestures commit one undo entry.
- Pointer movement and drag frames stay inside React Flow or local gesture state; the store receives
  committed changes only (`commitModel`, with undo history).
- A fresh workspace starts empty; Mining presets load only after explicit selection.
  Skip only exact untouched copies of the retired starter during draft hydration;
  never clear edited models based on an ID or metadata marker alone.
- One local draft is stored in IndexedDB (localStorage fallback), debounced.
  Store schema-valid work-in-progress even when graph/time diagnostics prevent
  analysis. Checkpoint synchronously on pagehide; restore the newest copy.
  Data-only exports remain available while analysis is pending or unavailable;
  generated analysis reports require a current result.
  Clean up timers, workers, listeners and object URLs on unmount.
- Event logs are capped at `MAX_EVENT_ROWS` (500,000) and OR enumeration at 12
  branches; keep every new loop or enumeration bounded.

## 9. Security and secrets

- Never put secrets in source, logs, tests, README or committed config.
  The app needs no environment files; all `.env` and `.env.*` files are ignored.
- Treat imported files as untrusted: parse with the bounded parsers, never
  `eval`, never inject imported text as HTML.
- Do not add a dependency without checking existing packages first and stating
  its purpose, size, licence and maintenance in the change summary.

## 10. Vercel and release hygiene

- The Vercel project uses Root Directory `apps/web` (config in
  `apps/web/vercel.json`), Node 22 (`.nvmrc`, `engines`) and pnpm from
  `packageManager`. The app needs no environment variables.
- Do not deploy to production, create Vercel projects or change domains
  unless explicitly asked. Never commit `.next`, `.vercel`, `.turbo`, drafts
  or machine-specific settings.

## 11. Required verification

Run all of these before declaring work done, and report the real results:

```bash
pnpm format:check
pnpm test
pnpm lint        # must report 0 warnings
pnpm typecheck
pnpm build
```

For UI changes also start `pnpm start` and check the affected flows in a
browser at mobile and desktop widths with no console errors. Never claim a
check passed unless you ran it.

## 12. Preserving user work

- Never run `git reset --hard`, `git clean -fd`, `git checkout -- .` or force
  pushes, and never delete or overwrite changes you did not make.
- Do not commit or push unless the user explicitly asks. Keep unrelated
  changes out of your diff.

## 13. GitNexus code review

- GitNexus is optional developer tooling, never a browser/runtime dependency.
- Run `pnpm graph:index` before relying on graph results after code changes;
  `pnpm graph:check` must report no circular file imports. Indexing uses
  `--index-only --pdg` to preserve this file and avoid injecting other agent files.
- Keep `.gitnexus/` ignored. Never index local drafts, imported user logs, build
  output, caches or generated media. See `.gitnexusignore`.
- Use query/context/impact for execution paths and change scope, and PDG queries
  for guards/data flow. Verify every suspected issue in actual source and tests;
  unresolved dynamic/aliased references are not evidence of unused code.
- Preserve public package exports when extracting shared types. Packages must
  not import their own barrel when that barrel exports the importing module.
- Local draft hydration cannot overwrite edits/imports made while storage loads.
  File extraction must terminate on cancellation and ignore superseded results.
  Header and dropped-file imports share one latest-request lifecycle; cancelled
  reads must not apply a model or display a success message.
