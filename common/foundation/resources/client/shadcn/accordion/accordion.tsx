import {Accordion as AccordionPrimitive} from '@base-ui/react/accordion';

import {cn} from '@ui/utils/cn';
import {ChevronDownIcon, ChevronUpIcon} from 'lucide-react';

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

function AccordionItem({className, ...props}: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        'overflow-hidden not-last:border-b group-data-[variant=separated]/accordion:rounded-card-sm group-data-[variant=separated]/accordion:border group-data-[variant=separated]/accordion:data-open:border-foreground/15 group-data-[variant=separated]/accordion:data-open:shadow',
        className,
      )}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex flex-1">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group/accordion-trigger relative flex flex-1 items-center justify-between gap-4 p-3 text-start text-sm font-medium transition-all outline-none group-data-[variant=bordered]/accordion:hover:bg-accent/80 group-data-[variant=default]/accordion:hover:underline group-data-[variant=separated]/accordion:hover:bg-accent/80 focus-visible:underline aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ms-auto **:data-[slot=accordion-trigger-icon]:text-muted-foreground [&_svg:not([class*="size-"])]:size-4',
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
      className="overflow-hidden text-sm group-data-[variant=bordered]/accordion:pt-1.5 group-data-[variant=separated]/accordion:pt-1.5 data-open:animate-accordion-down data-closed:animate-accordion-up"
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
