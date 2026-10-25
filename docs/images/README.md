# Demo image provenance

All images are real browser captures of the local Flowculus production build, with
illustrative bundled data. Captured at 1440 px desktop width on 2026-10-25/26 and
compressed to WebP; they are not generated mockups.

- `image-reference.webp`: visible image settings/removal controls with a synthetic test diagram.
- `inspector-select.webp`: a cropped production inspector with long synthetic node labels/IDs, showing single-line selected values; captured in Vietnamese light theme on 2026-10-26.
- `project-navigation.webp`: a 760 × 350 crop of the Vietnamese header and open brand menu; workspace modes appear only in the header switch.
- `empty-workspace.webp`: the actual empty first-visit canvas, Vietnamese light theme.
- `formula-or.webp`: the conditional OR equations rendered with native MathML,
  with independent-branch assumptions explained in Vietnamese.
- `knowledge.webp`: the Vietnamese knowledge page in its light theme.
  Refreshed on 2026-10-26 with the shared Mô hình/Model navigation label.
- `rework.webp`: the isolated rework example, 120 minutes/attempt, 50% repeated
  rework, showing the engine result of 240 minutes.
- `../../apps/web/public/demo/workspace.webp` and `workspace-dark.webp`: an explicitly imported
  illustrative request-handling model, with the analysis dock open in light and dark themes,
  refreshed after the BPMN symbols, endpoint controls and scrollable task metadata updates.
- `../../apps/web/public/demo/workspace-vi.webp` and `workspace-vi-dark.webp`:
  equivalent Vietnamese demo with translated illustrative node/flow labels. The
  About page selects the matching locale/theme; user-owned labels are never
  automatically translated.

Gateway markers in lessons and editor now share the same geometry definition.

Use `pnpm build` then `pnpm start` to reproduce the running surface. The pages
retain their own live interactive controls; the README embeds static captures.
