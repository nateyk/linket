import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {resolveBiolinkSegmentedTabsAppearance} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Tabs} from '@shadcn/tabs/tabs';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import type {ReactNode} from 'react';

export type ProductTabSection = {
  value: string;
  label: ReactNode;
  content: ReactNode;
};

/**
 * Sticky section switcher for the product page. Shares Appearance-driven
 * segmented Tabs chrome with the storefront Products/About strip.
 */
export function ProductTabs({
  sections,
  appearance,
}: {
  sections: ProductTabSection[];
  appearance?: BiolinkAppearanceConfig | null;
}) {
  const {trans} = useTrans();
  const segmented = resolveBiolinkSegmentedTabsAppearance(appearance);

  if (sections.length === 0) return null;
  if (sections.length === 1) return sections[0].content;

  return (
    <Tabs.Root defaultValue={sections[0].value} className="min-w-0 gap-4">
      {/* Padding (not bare overflow-x) keeps soft-pop tab shadows inside the
          scrollport — overflow-x:auto forces y-clip that would shear Hard. */}
      <div className="sticky top-0 z-20 flex snap-x snap-mandatory scroll-px-1 scrollbar-none overflow-x-auto overscroll-x-contain px-1 pt-1 pb-3">
        <Tabs.List
          aria-label={trans({message: 'Product information'})}
          style={segmented.style}
          indicatorClass={segmented.indicatorClassName}
          className={cn('w-max shrink-0', segmented.listClassName)}
        >
          {sections.map(section => (
            <Tabs.Tab
              key={section.value}
              value={section.value}
              className={cn(segmented.tabClassName, 'snap-start')}
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
          className="text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid"
        >
          {section.content}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
