# ADR 0004: Build with webpack so module workers are bundled

Status: accepted

## Context

The analysis and mining engines run in module Web Workers created with
`new Worker(new URL('../workers/x.worker.ts', import.meta.url), { type: 'module' })`.
With Turbopack (the Next.js 16.3 default), `next build` emitted these files as
raw `static/media/*.worker.*.ts` assets instead of bundled chunks. Browsers
cannot run that file as a worker, so the app silently fell back to running
analysis and mining on the main thread in production. Variants (no options,
no `name`, no extension) produced the same output.

## Decision

- `apps/web` uses `next build --webpack` and `next dev --webpack`. Webpack 5
  bundles each worker as `flowculus-analysis.*.js` / `flowculus-mining.*.js`
  (named by the `name` option).
- `scripts/verify-worker-bundle.mjs` runs after every build and fails it if a
  raw worker source is emitted or a worker chunk is missing, so a future
  bundler switch cannot regress silently.

## Consequences

- Production builds take longer (about 45 s instead of about 20 s locally) and
  development uses webpack's slower refresh.
- Workers now really run off the main thread (verified in Chromium: both
  worker chunks load and the status bar reports worker results).
- Revisit when Turbopack bundles `new Worker(new URL(...))` targets; remove
  `--webpack` only if the verification script passes.
