import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {useTrans} from '@ui/i18n/use-trans';
import {CircleQuestionMarkIcon} from 'lucide-react';
import type {ReactNode} from 'react';

interface ProductEditorSectionProps {
  id: string;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
}

/**
 * Compact section chrome shared only by Digital, E-book and Audio.
 * Keeps all fields visible; the supplementary guidance opens on demand.
 * Course Builder owns its own separate layout and is not affected.
 */
export function ProductEditorSection({id, title, description, children}: ProductEditorSectionProps) {
  const {trans} = useTrans();

  return (
    <section
      role="region"
      aria-labelledby={id}
      data-slot="product-editor-section"
      className="min-w-0 rounded-card-sm border border-border bg-card p-4 sm:p-5"
    >
      <header className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <h2 id={id} tabIndex={-1} className="min-w-0 scroll-mt-24 text-base font-semibold leading-6 text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          {title}
        </h2>
        <Popover.Root>
          <Popover.Trigger
            render={<Button type="button" size="icon-sm" variant="ghost" className="size-10 shrink-0 text-muted-foreground" />}
            aria-label={trans({message: 'About this section'})}
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
      <div className="min-w-0">{children}</div>
    </section>
  );
}
