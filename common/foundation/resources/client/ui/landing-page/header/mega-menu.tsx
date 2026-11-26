'use client';

import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import type {MouseEvent} from 'react';
import {Link} from 'react-router';
import type {HeaderSubItem} from './linket-nav-links';

type MegaMenuProps = {
  items: HeaderSubItem[];
  columns?: 1 | 2;
  ariaLabel: string;
  onItemNavigate?: (href: string, e: MouseEvent<HTMLAnchorElement>) => void;
};

export function MegaMenu({
  items,
  columns = 2,
  ariaLabel,
  onItemNavigate,
}: MegaMenuProps) {
  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        'max-w-[calc(100vw-2rem)] p-2',
        columns === 2 ? 'w-[560px]' : 'w-[340px]',
      )}
    >
      <ul
        className={cn(
          'grid gap-1',
          columns === 2 ? 'grid-cols-2' : 'grid-cols-1',
        )}
      >
        {items.map(item => {
          const Icon = item.icon;
          const cardClassName =
            'group/item flex items-start gap-3 rounded-card-sm p-3 text-start no-underline transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-foreground';

          const content = (
            <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-card-sm bg-muted text-foreground transition-colors group-hover/item:bg-primary/10 group-hover/item:text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium leading-snug text-foreground">
                  <Trans {...item.label} />
                </span>
                {item.description ? (
                  <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                    <Trans {...item.description} />
                  </span>
                ) : null}
              </span>
            </>
          );

          return (
            <li key={item.id}>
              {item.isRoute ? (
                <Link
                  to={item.href}
                  className={cardClassName}
                  onClick={() => {
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                  }}
                >
                  {content}
                </Link>
              ) : (
                <a
                  href={item.href}
                  className={cardClassName}
                  onClick={e => onItemNavigate?.(item.href, e)}
                >
                  {content}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
