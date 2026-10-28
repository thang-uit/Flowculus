'use client';

import * as Select from '@radix-ui/react-select';
import { CaretDown, Check } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

export interface AppSelectOption {
  value: string;
  label: string;
}

/** Brand-consistent select with native-equivalent keyboard and touch behavior. */
export function AppSelect({
  id,
  value,
  options,
  onValueChange,
  className,
  required,
  disabled,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: Readonly<{
  id: string;
  value: string;
  options: readonly AppSelectOption[];
  onValueChange: (value: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}>) {
  // Use internal index tokens: imported node IDs may contain any string,
  // including empty or names that resemble a reserved sentinel.
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        requestAnimationFrame(() => trigger?.focus());
      }
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [open, trigger]);
  return (
    <Select.Root
      open={open}
      onOpenChange={setOpen}
      value={selectedIndex >= 0 ? `option-${selectedIndex}` : ''}
      onValueChange={(next) => {
        const index = Number(next.slice('option-'.length));
        if (next === `option-${index}` && options[index])
          onValueChange(options[index].value);
      }}
      required={required}
      disabled={disabled || options.length === 0}
    >
      <Select.Trigger
        ref={setTrigger}
        id={id}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        title={options[selectedIndex]?.label}
        className={cn(
          'focus-ring flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-left text-sm text-[var(--text)] shadow-none hover:border-[var(--border-strong)] data-[state=open]:border-[var(--accent-strong)] disabled:opacity-50',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          <Select.Value />
        </span>
        <Select.Icon className="shrink-0 text-[var(--muted-strong)]">
          <CaretDown size={14} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={trigger?.closest<HTMLElement>('[role="dialog"]')}>
        <Select.Content
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            setOpen(false);
          }}
          position="popper"
          sideOffset={5}
          collisionPadding={8}
          className="z-[100] max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] max-w-[min(28rem,var(--radix-select-content-available-width))] app-menu overflow-hidden"
        >
          <Select.Viewport className="max-h-[19rem] overflow-y-auto scrollbar-thin">
            {options.map((option, index) => (
              <Select.Item
                key={`${index}:${option.value}`}
                value={`option-${index}`}
                className="app-menu__item app-select-item relative min-w-0 select-none pr-8 outline-none data-[state=checked]:font-semibold"
              >
                <span className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">
                  <Select.ItemText>{option.label}</Select.ItemText>
                </span>
                <Select.ItemIndicator className="absolute right-2 text-[var(--accent-strong)]">
                  <Check size={15} weight="bold" aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
