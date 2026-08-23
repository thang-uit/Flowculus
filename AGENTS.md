# Flowculus project rules

## Scope

These rules apply to this repository. Keep the product browser-first, responsive, accessible and fast during canvas interaction.

## Architecture

- `apps/web` owns routing, composition and presentation.
- `packages/process-model` owns serializable domain types.
- `packages/validation` owns input and graph validation.
- `packages/analysis-engine` owns cycle-time formulas and reports.
- `packages/formula-renderer` owns formula AST formatting for UI/report adapters.
- `packages/drawio-adapter` owns draw.io protocol details only.
- `packages/file-formats` owns import/export serialization.
- Domain packages must not import React, Next.js, DOM APIs or CSS.
- React components must not contain cycle-time formulas.

## Naming

- Components and component files use `PascalCase`.
- Hooks use `useX` exports and `use-kebab-case.ts` filenames.
- Functions and variables use `camelCase`.
- Types and interfaces use `PascalCase`.
- Constants use `UPPER_SNAKE_CASE` only when they are module-level invariants.
- Use explicit domain names. Avoid vague names such as `data`, `helper`, `thing` and `misc`.

## UI and accessibility

- Use semantic HTML and keyboard-operable controls.
- Use one yellow accent token consistently in light and dark themes.
- Keep focus states visible and maintain WCAG AA contrast.
- Use `min-h-[100dvh]` for viewport layouts, never `h-screen`.
- Keep mobile editor actions reachable with a bottom sheet or compact toolbar.
- Respect `prefers-reduced-motion`.

## Performance

- Do not put pointer coordinates or drag frames in React global state.
- Keep parsing, validation and analysis pure and worker-ready.
- Debounce persistence and use IndexedDB for large files.
- Lazy-load heavy integrations such as draw.io and image recognition.
- Animate only `transform` and `opacity`.

## Verification

Before opening a pull request, run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Do not claim a check passed unless it was run. Preserve unrelated user changes and do not commit or push unless explicitly requested.

## File and module boundaries

- Keep feature-specific UI in `apps/web/components` and feature-specific browser
  adapters in `apps/web/lib`. Do not turn `lib` into an unbounded catch-all.
- A page or workspace component composes child components; it must not become the
  home for API calls, domain formulas, large type declarations or export codecs.
- Put serializable business concepts in the appropriate package under
  `packages/`. Those packages must remain usable from a Worker and from tests.
- Shared UI primitives belong in `apps/web/components/ui`; process-specific UI
  belongs beside the feature that owns it. Avoid one-off copies of buttons,
  tooltips, inputs or validation messages.
- Keep public imports stable. If a module exposes a public API, prefer an
  additive change and update its tests and consumers together.
- Avoid circular dependencies. Dependency direction is from app composition to
  domain packages, never from domain code back into React or Next.js.

## Interaction and accessibility

- English is the default locale. Every user-visible string added to the product
  must have an English value and a Vietnamese value in `apps/web/lib/i18n.ts`.
- Every button, link, menu trigger, file input and custom control needs an
  accessible name, a visible focus state and a pointer cursor. Informational
  text and status badges keep the normal cursor.
- Use the shared Radix tooltip wrapper for compact icon-only controls. Keep a
  native `title` or visible text fallback when a tooltip cannot open on touch.
- Do not put hover-only behavior on the draw.io iframe. Pointer movement and
  drag frames stay inside draw.io; React receives committed snapshots only.
- Mobile layouts must work at 320px, 390px and 430px CSS widths. Prefer compact
  action bars, bottom sheets and intentional horizontal scrollers over clipped
  controls.

## Domain correctness

- Cycle-time, cost, capacity and queue formulas live only in
  `packages/analysis-engine`. UI code renders reports and never reimplements a
  formula.
- A result must carry its quality (`exact`, `assumption` or
  `simulation-required`) and preserve warnings when metadata is missing,
  inferred, cyclic or structurally unsupported.
- Never silently infer a gateway or rework rule and present it as exact. A
  native draw.io file without Flowculus metadata remains editable, but requires
  explicit semantic confirmation before a result is shared.
- `.drawio` XML remains the visual interchange source; Flowculus metadata is an
  additive bridge. Do not remove unknown draw.io cells, styles, libraries or
  pages during import/export.

## Performance and release hygiene

- Lazy-load heavy integrations and keep analysis/image work off the main thread
  when practical. Cancel timers, workers, object URLs and event listeners on
  unmount.
- Do not add a dependency without checking the existing workspace and explaining
  its bundle, maintenance and security impact in the change summary.
- Do not commit secrets, generated `.next` output, local drafts or machine-
  specific configuration. Do not commit or push unless the user explicitly asks.
