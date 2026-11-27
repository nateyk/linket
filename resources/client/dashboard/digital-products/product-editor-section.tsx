import type {ReactNode} from 'react';

interface ProductEditorSectionProps {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  active?: boolean;
}

/** Quiet section chrome for Digital, E-book and Audio; Course Builder is separate. */
export function ProductEditorSection({
  id,
  title,
  description,
  children,
  active = true,
}: ProductEditorSectionProps) {
  return (
    <section
      hidden={!active}
      inert={!active}
      role="region"
      aria-labelledby={id}
      data-slot="product-editor-section"
      className="min-w-0 rounded-card-sm border border-border/75 bg-card shadow-2xs p-4 sm:p-5"
    >
      <header className="mb-4 flex flex-col gap-1 border-b border-border/60 pb-3">
        <h2
          id={id}
          tabIndex={-1}
          className="min-w-0 scroll-mt-24 text-base font-semibold leading-6 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {title}
        </h2>
        {description && (
          <p className="text-xs leading-4 text-muted-foreground">
            {description}
          </p>
        )}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
