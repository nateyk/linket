import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {CircleQuestionMarkIcon, type LucideIcon} from 'lucide-react';
import type {ReactNode} from 'react';

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
  hasError?: boolean;
  children: ReactNode;
}

/** One focused panel in the guided Service Creation experience. */
export function ServiceFormSection({
  id,
  title,
  description,
  icon: Icon,
  count,
  optional = false,
  hasError = false,
  children,
}: ServiceFormSectionProps) {
  const {trans} = useTrans();

  return (
    <section
      id={`service-step-${id}`}
      aria-labelledby={`service-step-${id}-heading`}
      className={cn(
        'min-w-0 overflow-hidden rounded-card-sm border border-border bg-card',
        hasError && 'border-destructive/60',
      )}
    >
      <header className="mx-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pt-3 pb-3 sm:mx-5 sm:pt-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <h2
            id={`service-step-${id}-heading`}
            tabIndex={-1}
            className="min-w-0 text-base leading-6 font-semibold focus-visible:outline-2 focus-visible:outline-ring"
          >
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {optional && <Badge variant="ghost">{trans({message: 'Optional'})}</Badge>}
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="min-w-5 px-1.5">{count}</Badge>
          )}
          <Popover.Root>
            <Popover.Trigger
              render={<Button type="button" variant="ghost" size="icon-sm" className="size-10 text-muted-foreground" />}
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
        </div>
      </header>
      <div className="min-w-0 px-4 pt-4 pb-4 sm:px-5 sm:pt-4 sm:pb-5">{children}</div>
    </section>
  );
}
