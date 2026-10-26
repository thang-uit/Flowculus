'use client';

import { useRef, type ComponentPropsWithRef, type ElementType } from 'react';
import { ArrowUpRight } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { focusMenuItem } from '@/lib/ui/menu-navigation';

export interface AppMenuAction {
  id: string;
  label: string;
  icon?: ElementType;
  href?: string;
  external?: boolean;
  accessibleLabel?: string;
  shortcut?: string;
  disabled?: boolean;
  tone?: 'danger';
  onSelect?: () => void;
}
export interface AppMenuSection {
  id: string;
  label?: string;
  actions: readonly AppMenuAction[];
}

export function MenuSurface({
  sections,
  onSelect,
  className,
  onKeyDown,
  ...props
}: Omit<ComponentPropsWithRef<'div'>, 'onSelect'> & {
  sections: readonly AppMenuSection[];
  onSelect: (action: AppMenuAction) => void;
}) {
  const search = useRef({ value: '', at: 0 });
  return (
    <div
      {...props}
      role="menu"
      className={cn('app-menu scrollbar-thin', className)}
      onKeyDown={(event) => {
        if (focusMenuItem(event.currentTarget, event.key)) {
          event.preventDefault();
          event.stopPropagation();
        } else if (event.key === ' ' && document.activeElement?.tagName === 'A') {
          event.preventDefault();
          (document.activeElement as HTMLElement).click();
        } else if (
          event.key.length === 1 &&
          event.key !== ' ' &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          const now = Date.now();
          search.current = {
            value:
              (now - search.current.at < 600 ? search.current.value : '') + event.key,
            at: now,
          };
          const items = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              '[role="menuitem"]:not(:disabled)',
            ),
          ];
          const normalize = (value: string) =>
            value
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLocaleLowerCase();
          const start = items.indexOf(document.activeElement as HTMLElement) + 1;
          for (let step = 0; step < items.length; step++) {
            const item = items[(start + step) % items.length];
            if (
              normalize(item.textContent ?? '')
                .trim()
                .startsWith(normalize(search.current.value))
            ) {
              event.preventDefault();
              item.focus();
              break;
            }
          }
        } else onKeyDown?.(event);
      }}
    >
      {sections.map((section) => (
        <div
          key={section.id}
          role="group"
          aria-label={section.label}
          className="app-menu__section"
        >
          {section.label ? (
            <p className="app-menu__label" aria-hidden="true">
              {section.label}
            </p>
          ) : null}
          {section.actions.map((action) => {
            const Icon = action.icon;
            const content = (
              <>
                {Icon ? <Icon size={17} aria-hidden="true" className="shrink-0" /> : null}
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  {action.label}
                </span>
                {action.shortcut ? (
                  <span className="app-menu__shortcut">{action.shortcut}</span>
                ) : null}
                {action.external ? (
                  <ArrowUpRight size={12} aria-hidden="true" className="shrink-0" />
                ) : null}
              </>
            );
            const shared = {
              role: 'menuitem',
              tabIndex: -1,
              'aria-label': action.accessibleLabel,
              className: 'focus-ring app-menu__item',
              'data-tone': action.tone,
              onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
                if (event.pointerType !== 'touch' && !action.disabled)
                  event.currentTarget.focus({ preventScroll: true });
              },
              onClick: () => onSelect(action),
            };
            return action.href && !action.disabled ? (
              <a
                key={action.id}
                {...shared}
                href={action.href}
                target={action.external ? '_blank' : undefined}
                rel={action.external ? 'noopener noreferrer' : undefined}
              >
                {content}
              </a>
            ) : (
              <button
                key={action.id}
                {...shared}
                type="button"
                disabled={action.disabled}
              >
                {content}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
