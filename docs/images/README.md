# Demo image provenance

All images are real browser captures of the local Flowculus production build,
compressed to WebP; they are not generated mockups. Workspace examples use explicitly
imported synthetic files, never user work or an automatic starter. The generic
request-handling input was an ignored local QA file, not bundled product data.
Capture dates below use Asia/Ho_Chi_Minh; adjacent `.webp.json` sidecars retain
source details and timestamps. Full source viewports are 1440 px wide, with crops
noted separately.

## Refreshed on 2026-10-29

- `image-reference.webp`: Vietnamese dark Image Trace review, 1440 × 1000, after
  explicitly uploading the external synthetic `05_hand_drawn_photo.png` sample.
  Three task frames and two connectors are detected. Handwritten hours remain
  blank for manual review. Updated copy explains manual entry and unit conversion.
  The original sample and the editable candidate review are both visible.

## Refreshed on 2026-10-27 and 2026-10-28

- `empty-workspace.webp`: an actual empty new process tab with Pool/Lane tools, Vietnamese light theme, 1440 × 900, recaptured on 2026-10-28. Earlier QA tabs remain visible. The new process has no starter diagram.
- `knowledge.webp`: Vietnamese light Knowledge index with search, contents and
  the 27-topic catalog, 1440 × 1000, recaptured on 2026-10-28 after reviewing Pool/Lane, Petri verification, alignment, handoff, parallel-time, manual-save, multi-page recovery and bounded-report explanations. No canvas model is involved.
- `pools-lanes.webp`: Vietnamese light direct Pool/Lane palette and lane Inspector over an explicitly imported synthetic three-lane model, with inline naming, ordering, numeric divider resizing and deletion, 1440 × 1000. Recaptured on 2026-10-28.
- `mining-reference.webp`: Vietnamese dark Mining after explicitly uploading the
  external synthetic demonstration model/log, 1440 × 1000. The 8-case/48-event
  input yields alignment fitness 93.75% with 4/8 exactly compatible cases. Recaptured on 2026-10-28 with the explicit matching-case explanation;
  declared quality variants and coverage are visible. These are illustrative
  results, not measured production outcomes or independent PM4Py validation.
- `../../apps/web/public/demo/workspace.webp` and `workspace-dark.webp`: the
  explicitly imported generic request-handling model with direct Pool/Lane palette tools and scenario controls, English light/dark, 1440 × 900. Recaptured on 2026-10-28 using three lanes, CT 60 minutes, TCT 45 minutes and CTE 75%. Refreshed after the connected-file workflow update.
- `../../apps/web/public/demo/workspace-vi.webp` and `workspace-vi-dark.webp`:
  equivalent Vietnamese light/dark views with labels translated in the synthetic
  input. The About page selects the locale/theme image; user labels are never
  automatically translated.

## Earlier captures retained

- `document-workspace.webp` (2026-10-26): independent sortable process tabs, the
  open-process picker, user-defined names and browser/device save indicators.
- `document-save.webp` (recaptured 2026-10-28): Vietnamese light Save As dialog
  with the shared checkbox and current auto-save wording. Native file opening,
  connected writes and reload recovery were exercised separately with synthetic
  browser file handles. Operating-system permission dialogs remain browser-owned.
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
direct Pool/Lane palette and scenario controls.

Use `pnpm build` then `pnpm start` to reproduce the running surface. Explicitly
import the example files to reproduce populated views; the README embeds static
captures, while the application retains its live controls.
