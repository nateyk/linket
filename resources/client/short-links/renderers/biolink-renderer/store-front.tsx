import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {resolveBiolinkSegmentedTabsAppearance} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Tabs} from '@shadcn/tabs/tabs';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {ReactNode, useRef, type RefObject} from 'react';
import {Background} from './biolink-background';
import './store-front.css';

export interface StoreFrontTab {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

export interface StoreFrontProps {
  /** Tab entries: adding a tab is data only, no layout changes. */
  tabs: StoreFrontTab[];
  defaultTab?: string;
  className?: string;
  /**
   * Page background config. The sticky strip repaints it so the bar stays
   * opaque while the card scrolls behind and hides exactly at the tab line.
   */
  appearance: BiolinkAppearanceConfig | null;
}

export function StoreFront({
  tabs,
  defaultTab,
  className,
  appearance,
}: StoreFrontProps) {
  const stripRef = useRef<HTMLDivElement>(null);

  return (
    <Tabs.Root
      defaultValue={defaultTab ?? tabs[0]?.id}
      className={cn('min-w-0 max-w-full flex-col gap-0', className)}
      onValueChange={() => {
        // A tab switch lands on the newly selected panel with the strip
        // stuck at its top offset: jump to the strip's position instead
        // of resetting to the page top (which on mobile sits behind the
        // profile card). Per-tab scroll positions are not preserved —
        // one page scrollbar, no inner panel scroll.
        const strip = stripRef.current;
        if (!strip) {
          window.scrollTo({top: 0});
          return;
        }
        const inset =
          parseFloat(
            getComputedStyle(strip.closest('main') ?? document.body).paddingTop,
          ) || 0;
        const top = strip.getBoundingClientRect().top + window.scrollY - inset;
        window.scrollTo({top: Math.max(top, 0)});
      }}
    >
      <StoreTabs tabs={tabs} appearance={appearance} stripRef={stripRef} />
      <StoreCard>
        {tabs.map(tab => (
          <Tabs.Panel key={tab.id} value={tab.id}>
            {/* The tab label is this section's visible heading, but a tab
                trigger is not one: the sr-only h2 keeps the document outline
                intact (profile h1 → section h2 → card h3) for screen readers
                and heading-hierarchy checks. */}
            <h2 className="sr-only">{tab.label}</h2>
            {tab.content}
          </Tabs.Panel>
        ))}
      </StoreCard>
    </Tabs.Root>
  );
}

function StoreTabs({
  tabs,
  appearance,
  stripRef,
}: {
  tabs: StoreFrontTab[];
  appearance: BiolinkAppearanceConfig | null;
  stripRef: RefObject<HTMLDivElement | null>;
}) {
  const {trans} = useTrans();
  const segmented = resolveBiolinkSegmentedTabsAppearance(appearance);

  // Sticky strip keeps the section switcher reachable while product cards
  // scroll. Default (segmented) Tabs — roundness + active paint follow
  // Appearance Buttons so the strip matches View / Buy / bottom nav.
  return (
    <div
      ref={stripRef}
      className="sticky top-[var(--safe-top,env(safe-area-inset-top,0px))] z-10 flex-none bg-transparent"
    >
      <Background appearance={appearance} viewportFixed omitNoiseDef />
      {/* Extra bottom pad keeps Appearance hard/strong soft-pop casts
          inside the sticky strip when the track itself grows for shadow. */}
      <div className="flex justify-start overflow-visible px-4 pt-2 pb-3 sm:px-4">
        <Tabs.List
          aria-label={trans(message('Creator profile sections'))}
          style={segmented.style}
          indicatorClass={segmented.indicatorClassName}
          className={cn('w-fit', segmented.listClassName)}
        >
          {tabs.map(tab => (
            <Tabs.Tab
              key={tab.id}
              value={tab.id}
              className={segmented.tabClassName}
            >
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </div>
    </div>
  );
}

/**
 * The frame the tab cards live in: 16px below the tab strip, 16px sides,
 * and 32px below so the card's bottom corners and shadow stay fully visible
 * above the page's safe-area padding. The cards themselves are rendered by
 * each tab's content.
 */
function StoreCard({children}: {children: ReactNode}) {
  // Comfortable pad under the tab strip so enlarged product cards breathe.
  return (
    <div className="min-w-0 max-w-full px-4 pt-4 pb-8 sm:px-5">{children}</div>
  );
}
