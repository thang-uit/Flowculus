import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';

export function AppButton({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ComponentPropsWithRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type={type}
      className={cn(
        'focus-ring app-button',
        `app-button--${variant}`,
        `app-button--${size}`,
        className,
      )}
      {...props}
    />
  );
}
