/** Shared roving focus for action menus; form selects retain Radix listbox semantics. */
export function focusMenuItem(root: HTMLElement | null, key: string): boolean {
  const items = [
    ...(root?.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not(:disabled):not([aria-disabled="true"])',
    ) ?? []),
  ];
  if (!items.length) return false;
  const index = items.indexOf(document.activeElement as HTMLElement);
  const next =
    key === 'Home'
      ? 0
      : key === 'End'
        ? items.length - 1
        : key === 'ArrowDown'
          ? (index + 1) % items.length
          : key === 'ArrowUp'
            ? index < 0
              ? items.length - 1
              : (index - 1 + items.length) % items.length
            : -1;
  if (next < 0) return false;
  items[next].focus();
  return true;
}

export function menuPosition(
  anchor: { left: number; right: number; bottom: number; top: number },
  width: number,
  height: number,
  viewport: { width: number; height: number },
  align: 'start' | 'end',
) {
  const gutter = 8;
  const left = Math.max(
    gutter,
    Math.min(
      align === 'start' ? anchor.left : anchor.right - width,
      viewport.width - width - gutter,
    ),
  );
  const below = viewport.height - anchor.bottom - gutter;
  const above = anchor.top - gutter;
  const flip = below < Math.min(height, 240) && above > below;
  const maxHeight = Math.max(48, flip ? above - 6 : below - 6);
  return {
    left,
    top: flip
      ? Math.max(gutter, anchor.top - Math.min(height, maxHeight) - 6)
      : Math.max(gutter, anchor.bottom + 6),
    maxHeight,
  };
}
