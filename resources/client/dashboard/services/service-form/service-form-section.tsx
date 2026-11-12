import {Badge} from '@shadcn/badge/badge';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import type {LucideIcon} from 'lucide-react';
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
        'min-w-0 overflow-hidden rounded-card border bg-card',
        hasError && 'border-destructive/60',
      )}
    >
      <header className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-1 px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <h2
            id={`service-step-${id}-heading`}
            tabIndex={-1}
            className="min-w-0 text-base leading-6 font-semibold focus-visible:outline-2 focus-visible:outline-primary"
          >
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {optional && <Badge variant="ghost">{trans({message: 'Optional'})}</Badge>}
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="min-w-5 px-1.5">{count}</Badge>
          )}
        </div>
        <p className="w-full text-sm leading-5 text-muted-foreground">{description}</p>
      </header>
      <div className="min-w-0 px-4 pt-2 pb-4 sm:px-5 sm:pt-3 sm:pb-5">{children}</div>
    </section>
  );
}
