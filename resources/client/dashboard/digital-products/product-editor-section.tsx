import type {ReactNode} from 'react';

interface ProductEditorSectionProps {
  id: string;
  title: ReactNode;
  children: ReactNode;
  active?: boolean;
}

/** Quiet section chrome for Digital, E-book and Audio; Course Builder is separate. */
export function ProductEditorSection({id, title, children, active = true}: ProductEditorSectionProps) {
  return (
    <section
      hidden={!active}
      inert={!active}
      role="region"
      aria-labelledby={id}
      data-slot="product-editor-section"
      className="min-w-0 rounded-card-sm border border-border bg-card p-4 sm:p-5"
    >
      <h2
        id={id}
        tabIndex={-1}
        className="mb-4 min-w-0 scroll-mt-24 border-b border-border pb-3 text-base font-semibold leading-6 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {title}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
