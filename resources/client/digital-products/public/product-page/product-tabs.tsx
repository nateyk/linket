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
 */
export function ProductTabs({sections}: {sections: ProductTabSection[]}) {
  if (sections.length === 0) return null;
  if (sections.length === 1) return sections[0].content;

  return (
    <Tabs.Root defaultValue={sections[0].value} className="min-w-0 gap-4">
      <div className="sticky top-0 z-20 flex rounded-card bg-[var(--biolink-surface-strong)] p-1 ring-1 ring-[var(--biolink-border)]">
        <Tabs.List
          variant="line"
          aria-label="Product information"
          className="w-full justify-start gap-0.5 bg-transparent p-0.5 text-[var(--biolink-muted-text)] sm:gap-1 [&>span:last-child]:bg-[var(--biolink-text)]"
        >
          {sections.map(section => (
            <Tabs.Tab
              key={section.value}
              value={section.value}
              className="h-[calc(100%-1px)] min-w-0 flex-initial truncate rounded-button px-2 py-1 text-sm font-medium text-[var(--biolink-muted-text)] data-active:text-[var(--biolink-text)] sm:px-3"
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
          className="text-sm outline-none"
        >
          {section.content}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
