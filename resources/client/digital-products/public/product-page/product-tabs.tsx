import {Tabs} from '@shadcn/tabs/tabs';
import type {ReactNode} from 'react';

export type ProductTabSection = {
  value: string;
  label: ReactNode;
  content: ReactNode;
};

/**
 * Sticky tab strip taken from the design template, rebuilt on the store's
 * biolink surface tokens. Sections that are not relevant to the product are
 * simply not passed in; a single section renders without the tab strip.
 *
 * The strip scrolls horizontally with snap instead of ellipsizing labels when
 * there is not enough width (below ~360px), and tabs grow to a 44px hit
 * height on coarse pointers while keeping the desktop scale.
 */
export function ProductTabs({sections}: {sections: ProductTabSection[]}) {
  if (sections.length === 0) return null;
  if (sections.length === 1) return sections[0].content;

  return (
    <Tabs.Root defaultValue={sections[0].value} className="min-w-0 gap-4">
      <div className="sticky top-0 z-20 flex snap-x snap-mandatory scroll-px-1 overflow-x-auto overscroll-x-contain rounded-card bg-[var(--biolink-surface-strong)] p-1 ring-1 ring-[var(--biolink-border)] scrollbar-none">
        <Tabs.List
          variant="line"
          aria-label="Product information"
          indicatorClass="bg-[var(--biolink-text,var(--color-foreground))]!"
          className="w-max shrink-0 justify-start gap-0.5 bg-transparent p-0.5 text-[var(--biolink-muted-text)] pointer-coarse:min-h-12 sm:gap-1"
        >
          {sections.map(section => (
            <Tabs.Tab
              key={section.value}
              value={section.value}
              className="flex-none snap-start rounded-button px-2 py-1 text-sm font-medium text-[var(--biolink-muted-text)] hover:text-[var(--biolink-text)] data-active:text-[var(--biolink-text)] group-data-[variant=line]/tabs-list:data-active:text-[var(--biolink-text)] pointer-coarse:min-h-11 sm:px-3"
            >
              {section.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </div>
      {sections.map(section => (
        <Tabs.Panel
          key={section.value}
          value={section.value}
          keepMounted
          className="text-sm focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2"
        >
          {section.content}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
