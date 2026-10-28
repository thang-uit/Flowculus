# Demo image provenance

All images are real browser captures of the local Flowculus production build,
compressed to WebP; they are not generated mockups. Workspace examples use explicitly
imported synthetic files, never user work or an automatic starter. The generic
request-handling input was an ignored local QA file, not bundled product data.
Capture dates below use Asia/Ho_Chi_Minh; adjacent `.webp.json` sidecars retain
source details and timestamps. Full source viewports are 1440 px wide, with crops
noted separately.

## Refreshed on 2026-10-27 and 2026-10-28

- `empty-workspace.webp`: the actual empty first-visit canvas, Vietnamese light
  theme, 1440 × 900; no model was imported.
- `knowledge.webp`: Vietnamese light Knowledge index with search, contents and
  the 27-topic catalog, 1440 × 1000, recaptured on 2026-10-28 with the work-calendar topic. No canvas model is involved.
- `pools-lanes.webp`: English light Pool/Lane dialog over an imported synthetic
  model, showing process scope, orientation, spatial lane order and membership
  controls, 1440 × 1000.
- `mining-reference.webp`: Vietnamese dark Mining after explicitly uploading the
  external synthetic demonstration model/log, 1440 × 1000. The 8-case/48-event
  input yields alignment fitness 93.75% with 4/8 exactly compatible cases. Recaptured on 2026-10-28 with the explicit matching-case explanation;
  declared quality variants and coverage are visible. These are illustrative
  results, not measured production outcomes or independent PM4Py validation.
- `../../apps/web/public/demo/workspace.webp` and `workspace-dark.webp`: the
  explicitly imported generic request-handling model with analysis dock,
  Pool/Lane and scenario controls, English light/dark, 1440 × 900.
- `../../apps/web/public/demo/workspace-vi.webp` and `workspace-vi-dark.webp`:
  equivalent Vietnamese light/dark views with labels translated in the synthetic
  input. The About page selects the locale/theme image; user labels are never
  automatically translated.

## Earlier captures retained

- `document-workspace.webp` (2026-10-26): independent sortable process tabs, the
  open-process picker, user-defined names and browser/device save indicators.
- `document-save.webp` (2026-10-26): process/file naming through AppDialog,
  AppButton and the shared rounded yellow checkbox; direct file writing depends
  on browser support.
- `image-reference.webp` (2026-10-26): image settings/removal with a synthetic diagram.
- `inspector-select.webp` (2026-10-26): Vietnamese light inspector cropped from
  1440 × 1000, showing long synthetic labels/IDs as single-line selected values.
- `project-navigation.webp` (2026-10-26): 760 × 350 crop of the Vietnamese header
  and brand menu; workspace modes appear only in the header switch, while the
  menu shares the export/context-menu surface.
- `connector-attachments.webp` (2026-10-25): Vietnamese light isolated synthetic
  model demonstrating explicit endpoint attachment; captured at 1440 × 900.
- `formula-or.webp` (2026-10-25): Vietnamese light native MathML OR equations and
  independent-branch assumptions.
- `rework.webp` (2026-10-25): isolated example with 120 minutes/attempt, 50%
  repeated rework and the engine result of 240 minutes.

Gateway markers in lessons and editor share one geometry definition. The older
captures document their named flows; only the refreshed set depicts the latest
Pool/Lane/scenario toolbar additions.

Use `pnpm build` then `pnpm start` to reproduce the running surface. Explicitly
import the example files to reproduce populated views; the README embeds static
captures, while the application retains its live controls.
