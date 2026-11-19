import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@shadcn/collapsible/collapsible';
import {Popover} from '@shadcn/popover/popover';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {ChevronDownIcon, CircleQuestionMarkIcon, type LucideIcon} from 'lucide-react';
import {useEffect, useState, type ReactNode} from 'react';

export type ServiceFormSectionId =
  | 'basics'
  | 'media'
  | 'packages'
  | 'faq'
  | 'buyer-questions'
  | 'contact';

interface ServiceFormSectionProps {
  id: ServiceFormSectionId;
  title: string;
  description: string;
  icon: LucideIcon;
  isComplete?: boolean;
  count?: number;
  optional?: boolean;
  collapsible?: boolean;
  hasError?: boolean;
  children: ReactNode;
}

/**
 * Primary stages stay open. Optional settings use the shared disclosure
 * primitive so an empty service does not render three full-size forms.
 * Existing values and validation errors automatically open their section.
 */
export function ServiceFormSection({
  id,
  title,
  description,
  icon: Icon,
  count,
  optional = false,
  collapsible = false,
  hasError = false,
  children,
}: ServiceFormSectionProps) {
  const {trans} = useTrans();
  const [expanded, setExpanded] = useState(Boolean(count) || hasError);

  useEffect(() => {
    if (hasError) setExpanded(true);
  }, [hasError]);

  const sectionClass = cn(
    'min-w-0 overflow-hidden rounded-card-sm border border-border bg-card',
    hasError && 'border-destructive/60',
  );
  const contentClass = 'min-w-0 px-4 pt-4 pb-4 sm:px-5 sm:pb-5';

  if (collapsible) {
    return (
      <Collapsible open={expanded || hasError} onOpenChange={setExpanded}>
        <section
          id={`service-step-${id}`}
          aria-labelledby={`service-step-${id}-heading`}
          className={sectionClass}
        >
          <CollapsibleTrigger
            className="flex min-h-14 w-full min-w-0 items-center gap-3 px-4 py-3 text-start hover:bg-muted/30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
            aria-label={title}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span
              id={`service-step-${id}-heading`}
              role="heading"
              aria-level={2}
              tabIndex={-1}
              className="min-w-0 flex-1 text-base leading-6 font-semibold"
            >
              {title}
            </span>
            {count !== undefined && count > 0 && (
              <Badge variant="secondary" className="min-w-5 px-1.5">{count}</Badge>
            )}
            <ChevronDownIcon
              aria-hidden="true"
              className={cn('size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', (expanded || hasError) && 'rotate-180')}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className={cn(contentClass, 'border-t border-border')}>{children}</div>
          </CollapsibleContent>
        </section>
      </Collapsible>
    );
  }

  return (
    <section
      id={`service-step-${id}`}
      aria-labelledby={`service-step-${id}-heading`}
      className={sectionClass}
    >
      <header className="mx-4 flex min-w-0 items-center gap-3 border-b border-border py-3 sm:mx-5 sm:py-4">
        <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <h2
          id={`service-step-${id}-heading`}
          tabIndex={-1}
          className="min-w-0 flex-1 text-base leading-6 font-semibold focus-visible:outline-2 focus-visible:outline-ring"
        >
          {title}
        </h2>
        {optional && <Badge variant="ghost" className="shrink-0">{trans({message: 'Optional'})}</Badge>}
        {count !== undefined && count > 0 && (
          <Badge variant="secondary" className="min-w-5 shrink-0 px-1.5">{count}</Badge>
        )}
        <Popover.Root>
          <Popover.Trigger
            render={<Button type="button" variant="ghost" size="icon-sm" className="size-10 shrink-0 text-muted-foreground" />}
            aria-label={trans({message: 'About :section', values: {section: title}})}
          >
            <CircleQuestionMarkIcon className="size-4" aria-hidden="true" />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="end" className="w-72 max-w-[calc(100vw-2rem)]">
              <Popover.Title className="text-sm">{title}</Popover.Title>
              <Popover.Description>{description}</Popover.Description>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </header>
      <div className={contentClass}>{children}</div>
    </section>
  );
}
