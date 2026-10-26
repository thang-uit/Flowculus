'use client';

import { Check } from '@phosphor-icons/react';
import type { ComponentPropsWithRef } from 'react';

/** A native checkbox keeps form, label and keyboard behaviour across browsers. */
export function AppCheckbox({
  className = '',
  ...props
}: Omit<ComponentPropsWithRef<'input'>, 'type'>) {
  return (
    <span className="app-checkbox">
      <input {...props} type="checkbox" className={`app-checkbox__input ${className}`} />
      <Check className="app-checkbox__mark" size={14} weight="bold" aria-hidden="true" />
    </span>
  );
}
