import { cn } from '@/lib/cn';

export function ScenarioField({
  id,
  label,
  hint,
  emptyValue,
  value,
  invalid,
  error,
  onChange,
  onBlur,
  integer = false,
}: Readonly<{
  id: string;
  label: string;
  hint: string;
  emptyValue: string;
  value: string;
  invalid: boolean;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  integer?: boolean;
}>) {
  return (
    <label className="min-w-0 space-y-1.5" htmlFor={id}>
      <span className="block truncate text-[11px] font-medium text-[var(--muted-strong)]">
        {label}
      </span>
      <input
        id={id}
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={emptyValue}
        className={cn(
          'focus-ring h-9 w-full rounded-lg border bg-[var(--surface)] px-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)]',
          invalid ? 'border-[var(--danger)]' : 'border-[var(--border)]',
        )}
        aria-invalid={invalid || undefined}
        aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
      />
      <span id={`${id}-hint`} className="block truncate text-[10px] text-[var(--muted)]">
        {hint}
      </span>
      {error ? (
        <span
          id={`${id}-error`}
          className="block text-[10px] leading-4 text-[var(--danger)]"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}
