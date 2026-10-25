# Image reference workflow review · Rà soát thao tác ảnh

## Changes · Thay đổi

- A visible canvas toolbar exposes **Image settings / Tùy chỉnh ảnh** and **Remove image / Xóa ảnh** even when the photo is locked or the header is compact. **Replace image / Thay ảnh** is inside settings. Removing the reference never deletes model shapes.
- The central first-visit guidance was removed as requested; the canvas stays blank.
- Header, drop and settings imports use the same latest-request path. Removing a photo invalidates pending decodes; replacement resets detection and crop state. Invalid replacement files preserve the current photo.
- Selection/removal is checkpointed synchronously. IndexedDB reads/writes respect that selection, preventing stale images returning after reload. Small presentation checkpoints preserve the latest committed position, rotation and opacity without putting photo bytes in localStorage.
- Photo dragging previews locally and commits once. Escape, pointer cancellation, lost capture and window blur cancel the gesture. Multiple pointers cannot take over an active drag.
- Detection waits for OpenCV's asynchronous runtime. Previously Mat functions were accessed before initialization. Contour checks reject non-convex/unsupported quadrilaterals; connector snapping measures actual boundaries and rejects interior ink and ambiguous endpoints. Boundary geometry is prepared once per scan, avoiding repeated sorting/allocation per Hough segment.
- Replacing the image/crop or changing rotation invalidates the old review. Detection requires 0° rotation so its output matches the displayed reference. Repeated draft creation is guarded; inferred semantics still require confirmation before export/share.

## Verification · Xác minh

- `pnpm check`: **293 tests / 46 files**, formatting, zero-warning lint, type checks and webpack production build with all four workers.
- `pnpm graph:check`: **0 circular imports** after indexing the final source.
- Chromium production browser checks: image removal + immediate reload, preserved original/traced shapes, invalid replacement, real OpenCV detection (four geometric shapes in a controlled fixture), blank-photo detection, stale result rejection, duplicate-click protection, drag cancellation/persistence and removal during delayed decoding.
- English/Vietnamese, light/dark, widths 320, 390, 430, 768, 1024, 1280, 1440 and 1920 px; photo settings and removal remain reachable. No page errors or console errors in the verified paths.
- Browser gestures were synthesized on Chromium; physical iOS/Android, Safari and assistive-technology testing remain separate checks.

## Limits · Giới hạn

Detection remains approximate: the controlled fixture does not establish accuracy on handwritten whiteboards. There is no handwritten OCR or reliable arrowhead recognition; proposed direction remains low-confidence and must be reviewed. Crop unrelated text/tables and use clear, straight-on photos. No new runtime dependencies were added.
