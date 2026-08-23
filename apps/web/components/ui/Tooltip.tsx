'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export function TooltipProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <TooltipPrimitive.Provider delayDuration={360} skipDelayDuration={120}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  children,
  content,
}: Readonly<{ children: React.ReactNode; content: string }>) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={8}
          collisionPadding={10}
          className="z-30 max-w-[min(280px,calc(100vw-1.25rem))] rounded-md border border-[color-mix(in_srgb,var(--surface)_18%,transparent)] bg-[var(--text)] px-2.5 py-1.5 text-xs font-medium leading-4 text-[var(--surface)] shadow-[var(--shadow-soft)] data-[state=closed]:animate-[tooltip-out_120ms_ease-in] data-[state=delayed-open]:animate-[tooltip-in_140ms_ease-out]"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-[var(--text)]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
