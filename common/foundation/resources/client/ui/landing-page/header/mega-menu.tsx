'use client';
import {ArrowUpRightIcon} from 'lucide-react';
import {Trans} from '@ui/i18n/trans';
type MenuItem = {name: string; href: string};
export function MegaMenu({items}: {items: MenuItem[]}) {
  return <nav aria-label="Explore Linket" className="w-[700px] max-w-[95vw] bg-background p-5 sm:p-7">
    <div className="grid gap-1 sm:grid-cols-2">{items.map(item => <a key={item.href} href={item.href} className="group flex min-h-12 items-center justify-between gap-3 rounded-lg p-3 text-sm font-medium text-foreground hover:bg-accent hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"><Trans message={item.name} /><ArrowUpRightIcon aria-hidden="true" className="size-4 shrink-0" /></a>)}</div>
  </nav>;
}
