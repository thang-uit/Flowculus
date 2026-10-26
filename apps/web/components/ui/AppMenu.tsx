'use client';

import { CaretDown } from '@phosphor-icons/react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { menuPosition } from '@/lib/ui/menu-navigation';
import { MenuSurface, type AppMenuAction, type AppMenuSection } from './MenuSurface';
import { Tooltip } from './Tooltip';

/** One lifecycle, collision strategy and keyboard model for toolbar action menus. */
export function AppMenu({
  label,
  trigger,
  sections,
  align = 'end',
  triggerClassName,
  width = 240,
}: Readonly<{
  label: string;
  trigger: ReactNode;
  sections: readonly AppMenuSection[];
  align?: 'start' | 'end';
  triggerClassName?: string;
  width?: number;
}>) {
  const [open, setOpen] = useState(false),
    [position, setPosition] = useState({ left: 8, top: 8, maxHeight: 400, width });
  const button = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null),
    initialFocus = useRef('first');
  const id = useId();
  const close = useCallback((restore = false) => {
    setOpen(false);
    if (restore) button.current?.focus();
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = button.current?.getBoundingClientRect();
      if (button.current?.getClientRects().length === 0) {
        close();
        return;
      }
      if (rect)
        setPosition((previous) => {
          const next = {
            ...menuPosition(
              rect,
              Math.min(width, window.innerWidth - 16),
              panel.current?.scrollHeight ?? 400,
              { width: window.innerWidth, height: window.innerHeight },
              align,
            ),
            width: Math.min(width, window.innerWidth - 16),
          };
          return previous.left === next.left &&
            previous.top === next.top &&
            previous.maxHeight === next.maxHeight &&
            previous.width === next.width
            ? previous
            : next;
        });
    };
    place();
    const items = panel.current?.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not(:disabled)',
    );
    items?.[initialFocus.current === 'last' ? items.length - 1 : 0]?.focus();
    const observer = new ResizeObserver(place);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, width, align, close]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !button.current?.contains(target) &&
        !panel.current?.contains(target)
      )
        close();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
    };
  }, [open, close]);
  const select = (action: AppMenuAction) => {
    close(true);
    action.onSelect?.();
  };
  return (
    <>
      <Tooltip content={label}>
        <button
          ref={button}
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          data-open={open}
          className={cn('focus-ring app-menu-trigger', triggerClassName)}
          onClick={() => {
            initialFocus.current = 'first';
            setOpen((value) => !value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              initialFocus.current = event.key === 'ArrowUp' ? 'last' : 'first';
              setOpen(true);
            }
          }}
        >
          {trigger}
          <CaretDown
            size={12}
            weight="bold"
            aria-hidden="true"
            className="app-menu-caret"
          />
        </button>
      </Tooltip>
      {open
        ? createPortal(
            <MenuSurface
              ref={panel}
              id={id}
              aria-label={label}
              sections={sections}
              onSelect={select}
              style={{ position: 'fixed', ...position }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                  close(true);
                } else if (event.key === 'Tab') {
                  button.current?.focus();
                  close();
                }
              }}
            />,
            document.body,
          )
        : null}
    </>
  );
}
