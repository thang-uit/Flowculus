# Knowledge and project pages

Mode: Read. This extends the established Flowculus visual system, with the user's
DataFusion reading guide supplying the information pattern: persistent contents,
readable chapters, search and illustrations. Build directly in code; no new visual
identity or decorative raster artwork is needed.

- `/knowledge`: a compact product header, searchable topic index, grouped contents,
  long-form articles with stable anchors, copyable formulas, semantic SVG diagrams,
  explanatory examples and an isolated rework playground using the real engine.
- `/about`: editorial project introduction, a process illustration, the two confirmed
  developers, verified profile links and the repository link.
- First viewport: the page purpose and navigation are immediately visible. Knowledge
  search and topics require no scroll on desktop. The about page demonstrates the
  product using a diagram before presenting its authors.
- Signature interaction: change the rework policy and see its different model and
  engine-produced result. Normal anchors, browser Find and local text search remain
  usable without a complex documentation runtime.
- Inherit theme tokens, Plus Jakarta Sans, Phosphor icons and the existing toggles.
  Short opacity/transform feedback respects reduced motion; content starts visible.
- Mobile contents collapse into a keyboard-accessible native disclosure. Diagrams
  scale or intentionally scroll, tables have labelled scroll containers, and the
  product header wraps rather than hiding access to a destination.
- Knowledge content and UI copy live under `lib/i18n/knowledge`; domain examples and
  search live under `lib/knowledge`; page composition and UI remain separate.
- Verification: formula examples against the engine, search normalization, stable
  anchors, complete bilingual content, all project gates, browser navigation/search,
  clipboard, theme/language, responsive widths and preserved draft editing.

- Workspace links to About/Knowledge open a separate tab with an accessible cue;
  the original model and live Mining log, filters and results stay available.

- Equations use native MathML with a separate prose explanation and text-copy action.
  Rework uses elapsed attempt time τ, explicitly distinguished from processing T.
- Browser page titles follow `<localized page name> | Flowculus`; locale changes
  synchronize across tabs. Workspace navigation retains the live editor in its tab.

- BPMN marker geometry is shared by palette, editor, lessons and SVG export.
  Quality overlays preserve solid semantic outlines; approximation is named in
  the legend. The notation table explicitly separates standard symbols from
  Flowculus execution support and the rework preset. Screenshot demos must be
  recaptured when shared editor UI changes.

- Reading body text is 16px, search inputs remain at least 16px, and examples use
  progressive paragraphs/subheadings rather than dense instruction lists.
- The rework playground belongs inside its topic article so active contents stay
  on rework while the reader experiments. Numeric steps reuse the engine AST;
  explain the zero-duration skip branch explicitly. Mobile contents return focus
  to the selected article after closing.
- Mining calls the observed non-repeating variant Common route / Luồng phổ biến;
  it is never labelled an approved reference process.
