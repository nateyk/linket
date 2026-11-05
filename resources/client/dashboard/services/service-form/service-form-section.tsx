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
  isComplete = false,
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
      <header className="flex items-start gap-3 border-b px-4 py-4 sm:px-6">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-card-sm bg-muted/70 text-muted-foreground',
            isComplete && 'bg-muted text-foreground',
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id={`service-step-${id}-heading`}
            tabIndex={-1}
            className="text-base leading-6 font-semibold focus-visible:outline-2 focus-visible:outline-ring"
          >
            {title}
          </h2>
          <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {optional && <Badge variant="ghost">{trans({message: 'Optional'})}</Badge>}
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="min-w-5 px-1.5">{count}</Badge>
          )}
        </div>
      </header>
      <div className="min-w-0 p-4 sm:p-6">{children}</div>
    </section>
  );
}
