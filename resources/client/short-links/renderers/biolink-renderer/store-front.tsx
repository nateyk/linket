import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
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
          parseFloat(getComputedStyle(strip.closest('main') ?? document.body).paddingTop) || 0;
        const top = strip.getBoundingClientRect().top + window.scrollY - inset;
        window.scrollTo({top: Math.max(top, 0)});
      }}
    >
      <StoreTabs tabs={tabs} appearance={appearance} stripRef={stripRef} />
      <StoreCard>
        {tabs.map(tab => (
          <Tabs.Panel key={tab.id} value={tab.id}>
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

  // The strip sticks to the top of the viewport; the card below it is a
  // plain block, so the card grows to full content height and the page
  // carries the one scrollbar. The strip is opaque: it repaints the page
  // background with both copies viewport-anchored (see Background's
  // viewportFixed), so the card is hidden exactly at the tab line as it
  // scrolls behind instead of showing through. It sticks below the
  // safe-area inset (`--safe-top` in the phone preview) so the strip
  // never slides under the status bar or Dynamic Island.
  return (
    <div
      ref={stripRef}
      className="sticky top-[var(--safe-top,env(safe-area-inset-top,0px))] z-10 flex-none border-b border-[var(--biolink-border)] bg-background"
    >
      <Background appearance={appearance} viewportFixed omitNoiseDef />
      <Tabs.List
        variant="line"
        aria-label={trans(message('Creator profile sections'))}
        indicatorClass="bg-[var(--biolink-accent)]!"
        className="w-fit gap-2 bg-transparent px-2 py-0 text-[var(--biolink-muted-text)]"
      >
        {tabs.map(tab => (
          <Tabs.Tab
            key={tab.id}
            value={tab.id}
            className="flex-none px-3 py-2.5 text-[var(--biolink-muted-text)] not-data-active:hover:text-[var(--biolink-text)]! data-active:text-[var(--biolink-accent)]! pointer-coarse:min-h-11"
          >
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </div>
  );
}

/**
 * The frame the tab cards live in: 16px below the tab line (the design's
 * gap), 16px sides, and 32px below so the card's bottom corners and shadow
 * stay fully visible above the page's safe-area padding. The cards
 * themselves are rendered by each tab's content.
 */
function StoreCard({children}: {children: ReactNode}) {
  return (
    <div className="min-w-0 max-w-full px-4 pt-4 pb-8">{children}</div>
  );
}
