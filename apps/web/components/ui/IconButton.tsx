import type { ButtonHTMLAttributes, ElementType } from 'react';

import { AppButton } from './AppButton';
import { cn } from '@/lib/cn';

type IconButtonVariant = 'default' | 'subtle' | 'accent' | 'ghost';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ElementType;
  label: string;
  variant?: IconButtonVariant;
  size?: 'sm' | 'md';
}

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
    <AppButton
      variant={
        variant === 'accent' ? 'primary' : variant === 'default' ? 'secondary' : 'ghost'
      }
      aria-label={label}
      title={label}
      className={cn(
        'focus-ring inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg transition-[background-color,border-color,color,transform,box-shadow] duration-150 disabled:cursor-not-allowed',
        'app-icon-button',
        size === 'sm' ? 'app-icon-button--sm' : 'app-icon-button--md',
        className,
      )}
      {...props}
    >
      <Icon size={size === 'sm' ? 17 : 18} weight="regular" aria-hidden="true" />
      {children}
    </AppButton>
  );
}
