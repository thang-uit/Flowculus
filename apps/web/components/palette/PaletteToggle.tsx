'use client';

import { CaretDown, CaretLeft, CaretRight, CaretUp } from '@phosphor-icons/react';

import { Tooltip } from '@/components/ui/Tooltip';
import { getWorkspaceCopy } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/use-preferences-store';
import { useWorkspaceStore } from '@/lib/workspace-store';

export const PALETTE_IDS = {
  desktop: 'flowculus-desktop-palette',
  mobile: 'flowculus-mobile-palette',
} as const;

export function PaletteToggle({
  placement = 'desktop',
}: Readonly<{
  placement?: keyof typeof PALETTE_IDS;
}>) {
  const open = useWorkspaceStore((state) => state.paletteOpen);
  const toggle = useWorkspaceStore((state) => state.togglePalette);
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getWorkspaceCopy(locale);
  const label = open ? copy.collapsePalette : copy.expandPalette;
  const Icon =
    placement === 'mobile' ? (open ? CaretUp : CaretDown) : open ? CaretLeft : CaretRight;
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={PALETTE_IDS[placement]}
        className="focus-ring palette-toggle inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        <Icon size={15} weight="bold" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
