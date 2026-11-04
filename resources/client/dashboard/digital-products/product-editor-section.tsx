import type {ReactNode} from 'react';

interface ProductEditorSectionProps {
  id: string;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
}

/** Shared section chrome; each product type owns its own content hierarchy. */
export function ProductEditorSection({id, title, description, children}: ProductEditorSectionProps) {
  return (
    <section role="region" aria-labelledby={id} className="min-w-0 rounded-card-sm border border-border bg-card p-4 sm:p-6">
      <header className="mb-4">
        <h2 id={id} className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
