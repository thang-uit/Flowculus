import { commitPendingInput } from '@/lib/documents/pending-input';

/** Keep invalid edits visible until they can be committed or explicitly dismissed. */
export function dismissInspectorOnOutsidePointer(
  event: PointerEvent,
  panel: HTMLElement | null,
  close: () => void,
): void {
  const target = event.target;
  if (!(target instanceof Element) || panel?.contains(target)) return;
  if (
    target.closest(
      '[data-inspector-toggle], [data-radix-popper-content-wrapper], [role="dialog"]',
    )
  )
    return;
  // Hiding the panel first would make Save/Export skip its inert invalid fields.
  if (!commitPendingInput()) {
    event.preventDefault();
    return;
  }
  close();
}
