import type { ButtonHTMLAttributes, ElementType } from 'react';

import { cn } from '@/lib/cn';

type IconButtonVariant = 'default' | 'subtle' | 'accent' | 'ghost';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ElementType;
  label: string;
  variant?: IconButtonVariant;
  size?: 'sm' | 'md';
}

const variantClasses: Record<IconButtonVariant, string> = {
  default:
    'border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]',
  subtle:
    'border border-transparent text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]',
  accent:
    'border border-[var(--accent-strong)] bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_3px_0_color-mix(in_srgb,var(--accent-strong)_65%,transparent)] hover:brightness-[1.03] active:translate-y-px active:shadow-none',
  ghost:
    'border border-transparent text-[var(--text)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]',
};

export function IconButton({
  icon: Icon,
  label,
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'focus-ring inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg transition-[background-color,border-color,color,transform,box-shadow] duration-150 disabled:cursor-not-allowed',
        size === 'sm' ? 'size-9' : 'size-10',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <Icon size={size === 'sm' ? 17 : 18} weight="regular" aria-hidden="true" />
      {children}
    </button>
  );
}
