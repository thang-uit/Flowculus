'use client';

import * as Select from '@radix-ui/react-select';
import { CaretDown, Check } from '@phosphor-icons/react';

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
}: Readonly<{
  id: string;
  value: string;
  options: readonly AppSelectOption[];
  onValueChange: (value: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}>) {
  // Use internal index tokens: imported node IDs may contain any string,
  // including empty or names that resemble a reserved sentinel.
  const selectedIndex = options.findIndex((option) => option.value === value);
  return (
    <Select.Root
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
        id={id}
        className={cn(
          'focus-ring flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-left text-sm text-[var(--text)] shadow-none hover:border-[var(--border-strong)] data-[state=open]:border-[var(--accent-strong)] disabled:opacity-50',
          className,
        )}
      >
        <Select.Value />
        <Select.Icon className="shrink-0 text-[var(--muted-strong)]">
          <CaretDown size={14} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={5}
          collisionPadding={8}
          className="z-[100] max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1 shadow-[var(--shadow-panel)]"
        >
          <Select.Viewport className="max-h-[19rem] overflow-y-auto scrollbar-thin">
            {options.map((option, index) => (
              <Select.Item
                key={`${index}:${option.value}`}
                value={`option-${index}`}
                className="relative flex min-h-9 cursor-pointer select-none items-center rounded-lg py-2 pl-2.5 pr-8 text-sm text-[var(--text)] outline-none data-[highlighted]:bg-[var(--accent-soft)] data-[highlighted]:text-[var(--text)] data-[state=checked]:font-semibold"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
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
