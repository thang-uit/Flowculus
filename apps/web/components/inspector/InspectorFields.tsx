'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { AppSelect } from '@/components/ui/AppSelect';

export const inspectorInputClass =
  'focus-ring h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-sm text-[var(--text)]';

const blurOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'Enter') event.currentTarget.blur();
};

export function FieldLabel({
  htmlFor,
  children,
}: Readonly<{ htmlFor: string; children: ReactNode }>) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] text-[var(--muted)]">
      {children}
    </label>
  );
}

interface NumberFieldProps {
  label: string;
  value: number | undefined;
  onCommit: (value: number | undefined) => void;
  /** Display multiplier, e.g. 100 to edit a probability as a percentage. */
  scale?: number;
  integer?: boolean;
  /** Inclusive upper bound in display units. */
  max?: number;
  /** Exclusive upper bound in display units (r < 100 %). */
  maxExclusive?: number;
  suffix?: string;
  errorMessage: string;
  className?: string;
}

const formatDisplay = (value: number | undefined, scale: number): string =>
  value == null ? '' : String(Number((value * scale).toFixed(4)));

/**
 * Numeric input that keeps the user's text while typing and only commits a
 * valid number on blur/Enter, so an intermediate value never reaches the
 * model or the worker. Remount it (via `key`) to show an external change.
 */
export function NumberField({
  label,
  value,
  onCommit,
  scale = 1,
  integer = false,
  max,
  maxExclusive,
  suffix,
  errorMessage,
  className,
}: Readonly<NumberFieldProps>) {
  const id = useId();
  const [text, setText] = useState(() => formatDisplay(value, scale));
  const [invalid, setInvalid] = useState(false);

  const commit = () => {
    const raw = text.trim();
    if (raw === '') {
      setInvalid(false);
      if (value != null) onCommit(undefined);
      return;
    }
    const parsed = Number(raw.replace(',', '.'));
    const bad =
      !Number.isFinite(parsed) ||
      parsed < 0 ||
      (integer && !Number.isInteger(parsed)) ||
      (max != null && parsed > max) ||
      (maxExclusive != null && parsed >= maxExclusive);
    setInvalid(bad);
    if (bad) return;
    const next = parsed / scale;
    if (value == null || Math.abs(next - value) > 1e-12) onCommit(next);
  };

  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <input
          id={id}
          inputMode={integer ? 'numeric' : 'decimal'}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={blurOnEnter}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className={cn(
            inspectorInputClass,
            suffix && 'pr-8',
            invalid && 'border-[var(--danger)]',
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-2.5 top-2.5 text-[11px] text-[var(--muted)]">
            {suffix}
          </span>
        ) : null}
      </div>
      {invalid ? (
        <p
          id={`${id}-error`}
          className="text-[10.5px] leading-4 text-[var(--danger)]"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  value,
  onCommit,
  maxLength,
  uppercase = false,
  className,
}: Readonly<{
  label: string;
  value: string | undefined;
  onCommit: (value: string | undefined) => void;
  maxLength?: number;
  uppercase?: boolean;
  className?: string;
}>) {
  const id = useId();
  const [text, setText] = useState(value ?? '');
  const commit = () => {
    const next = text.trim() || undefined;
    if (next !== (value?.trim() || undefined)) onCommit(next);
  };
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        value={text}
        maxLength={maxLength}
        onChange={(event) =>
          setText(uppercase ? event.target.value.toUpperCase() : event.target.value)
        }
        onBlur={commit}
        onKeyDown={blurOnEnter}
        className={cn(inspectorInputClass, uppercase && 'uppercase')}
      />
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}>) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <AppSelect
        id={id}
        value={value}
        options={options}
        onValueChange={(next) => onChange(next as T)}
      />
    </div>
  );
}

export function InspectorSection({
  title,
  aside,
  children,
}: Readonly<{ title: string; aside?: ReactNode; children: ReactNode }>) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-[var(--muted-strong)]">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
