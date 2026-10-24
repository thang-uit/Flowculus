# ADR 0002: Replace the draw.io iframe with a native React Flow canvas

Status: accepted

Supersedes: [ADR 0001](0001-browser-first-canvas-boundary.md)

## Context

ADR 0001 embedded the hosted draw.io editor in an iframe behind a `postMessage` adapter. In practice that boundary limited the product:

- draw.io exposes no lightweight selection event, so the inspector could not follow the canvas selection reliably.
- Analysis data (`T`, `Wq`, probabilities, the critical path) could not be drawn on the shapes themselves.
- Drag-and-drop from the Flowculus palette, undo/redo and zoom were split between two applications.
- The workspace depended on a third-party origin, a handshake timeout and a fallback preview.

The process-mining features also need to send discovered models to the canvas and frame them, which the iframe protocol did not support.

## Decision

- Render the canvas natively with `@xyflow/react` (React Flow 12, MIT). BPMN nodes, gateways and sequence flows are custom React components; the semantic `ProcessModel` in the workspace store stays the single source of truth.
- Keep draw.io as a **file format**, not a runtime: `@flowculus/drawio-adapter` imports `.drawio` files (plain, compressed, multi-page) and exports by patching the original XML, using the dependency-free `@flowculus/xml-tree` so it also runs in workers and tests.
- Add optional `bounds` to `ProcessNode` so position and size survive import, editing and export.
- Lay out and route edges with the in-repo `@flowculus/graph-layout`, shared by the canvas, SVG export and the mining map.

## Consequences

- Selection, inspector, quick actions, undo/redo and live KPIs work on one state model.
- Analysis results can be shown directly on the diagram, and diagram exports are rendered from the model rather than screenshotted.
- No external origin or environment variable is needed; `.env.example` and the iframe fallback were removed.
- Flowculus now owns canvas features that draw.io provided for free. Pools and lanes are imported as containers but not drawn; arbitrary draw.io stencils are imported as their nearest BPMN kind; manual edge waypoints are not stored in the model.
- New dependency: `@xyflow/react` 12 (MIT, maintained by xyflow). It adds about 20 packages to the lockfile: `@xyflow/system`, `classcat`, nine small d3 modules (zoom, drag, selection, transition and their helpers) with their `@types`, and its own `zustand` 4 (the app itself uses `zustand` 5).

## Later updates

- A comment-only `.env.example` was added back to document that the app reads
  no environment variables; it contains no values.
- Analysis honesty and the export gate are described in
  [ADR 0003](0003-honest-analysis-and-semantic-gate.md); worker bundling in
  [ADR 0004](0004-webpack-for-module-workers.md).
