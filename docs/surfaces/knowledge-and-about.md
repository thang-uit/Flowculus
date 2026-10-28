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

- The document workflow lesson explains independent process tabs, process/file naming,
  browser recovery versus device saves, session-only writable file access, fallback
  downloads, semantic review, guarded closing and concurrent-window storage ownership.
  Demo screenshots track the document bar and save dialog in all documented locales
  and themes. The incumbent yellow toolbar/token system remains the visual authority.

- Process tabs use rounded browser-style shoulders, a yellow active surface/top edge
  and separate close-button hover/focus feedback. Every close asks confirmation;
  clean copies and unsaved work have different actions and accurate bilingual copy.
  The desktop palette toggle is a compact 32 px yellow control with expanded state.

- Mining conversion asks for an explicit process name; sample log names remain source labels. The documents and DFG lessons explain naming, inferred routing and preservation of existing tabs.
- Device-save and image-lock options share AppCheckbox: rounded yellow styling, native checkbox semantics, visible keyboard focus, disabled, reduced-motion and forced-colors support.

- Menus, selects, modal dialogs, buttons and transient workspace notices share their primitives and tokens. Navigation/export/context menus support the same keyboard model and yellow interaction state; form selects retain listbox semantics.
- Process tabs reorder by pointer, touch hold, Alt+Shift+Left/Right or the tab context menu. Order is browser-persisted while per-document content/history/file/photo ownership is preserved.

- Pool/Lane is a participant/responsibility layer, not work duration. Knowledge distinguishes process scope and message communication from sequence flow. The About page describes BPMN XML and file-driven Mining without claiming full BPMN support.
- New Mining views reuse AppButton/AppSelect/AppDialog, the yellow/neutral theme tokens and Plus Jakarta Sans. Petri diagrams use the existing layered geometry; token controls and verification share one net model. Reference mapping searches the full activity vocabulary with at most 100 mounted rows; evidence names algorithms, budgets and compatible-case coverage.
- The catalog contains 27 bilingual topics, including Pool/Lane, bounded Petri verification, alignment evidence, resource direction and working calendars. Lessons distinguish theory from the implemented subset and do not imply general liveness/invariants, full BPMN execution or PNML import. Reference mapping requires exact unique labels or an explicit task selection. Fitness and completely matching-case counts are explained separately.
- The project demo uses an external model/log pair with optional standards and expected evidence. Fresh workspaces never auto-load it, and generated results are not embedded as static product claims. The expected evidence uses the same engine and scenario assertions, not independent PM4Py validation.
- Production captures refreshed on 2026-10-27 document the existing UI: the four locale/theme workspace images, empty workspace, Knowledge, Pool/Lane dialog and Mining reference evidence. Sources and older capture dates are recorded in `docs/images/README.md` and the adjacent image sidecars.
