import {Accordion as AccordionPrimitive} from '@base-ui/react/accordion';

import {cn} from '@ui/utils/cn';
import {ChevronDownIcon, ChevronUpIcon} from 'lucide-react';
import type {ReactElement} from 'react';

/**
 * A vertically stacked set of interactive headings that each reveal a section of content.
 */
function AccordionRoot({
  className,
  variant = 'default',
  ...props
}: AccordionPrimitive.Root.Props & {
  variant?: 'separated' | 'bordered' | 'default';
}) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      data-variant={variant}
      className={cn(
        'group/accordion flex w-full flex-col overflow-hidden data-[variant=bordered]:rounded-card data-[variant=bordered]:border data-[variant=separated]:gap-3',
        className,
      )}
      {...props}
    />
  );
}

function AccordionItem({
  className,
  variant = 'default',
  children,
  ...rest
}: AccordionPrimitive.Item.Props & {variant?: 'separated' | 'bordered' | 'default'}) {
  const isBordered = variant === 'bordered';

  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      data-variant={variant}
      className={cn(
        'overflow-hidden not-last:border-b group-data-[variant=separated]/accordion:rounded-card-sm group-data-[variant=separated]/accordion:border group-data-[variant=separated]/accordion:data-open:border-foreground/15 group-data-[variant=separated]/accordion:data-open:shadow',
        isBordered && 'relative',
        className,
      )}
      {...rest}
    >
      {isBordered && (
        <div
          data-slot="accordion-connector"
          aria-hidden="true"
          className="absolute left-[calc(var(--radius-card-sm)/2)] top-0 bottom-0 w-px bg-border"
        />
      )}
      {children}
    </AccordionPrimitive.Item>
  );
}

function AccordionTrigger({
  className,
  children,
  headingRender,
  ...props
}: AccordionPrimitive.Trigger.Props & {
  /**
   * Replaces the heading element the Base UI Header renders (its default is
   * `<h3>`). Pass e.g. `<h2 />` when the accordion sits directly under the
   * page `<h1>`, so section triggers don't skip a heading level. Omitting it
   * keeps the default `<h3>` — behavior is unchanged.
   */
  headingRender?: ReactElement;
}) {
  return (
    <AccordionPrimitive.Header
      className="flex flex-1"
      render={headingRender}
    >
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group/accordion-trigger relative flex flex-1 items-center justify-between gap-4 p-3 text-start text-sm font-medium transition-all outline-none group-data-[variant=bordered]/accordion:hover:text-primary group-data-[variant=default]/accordion:hover:underline group-data-[variant=separated]/accordion:hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-[-2px] aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ms-auto **:data-[slot=accordion-trigger-icon]:text-muted-foreground [&_svg:not([class*="size-"])]:size-4',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        />
        <ChevronUpIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="overflow-hidden text-sm group-data-[variant=bordered]/accordion:pt-0.5 group-data-[variant=separated]/accordion:pt-1.5 data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          'h-(--accordion-panel-height) px-4 pt-0 pb-4 data-ending-style:h-0 data-starting-style:h-0 [&_p:not(:last-child)]:mb-4',
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}

export const Accordion = Object.assign(AccordionRoot, {
  Root: AccordionRoot,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});
