import {Trans} from '@ui/i18n/trans';
import type {ReactNode} from 'react';

/**
 * Dedicated Digital Product editor layout. The parent owns API mutations,
 * authorization, uploads and saved-state transitions; this component owns
 * only the creator-facing information hierarchy.
 *
 * Unlike the legacy file-product accordion, all five tasks remain visible,
 * with private deliverables clearly separated from the optional public PDF.
 */
export interface DigitalProductEditorProps {
  details: ReactNode;
  files: ReactNode;
  sample: ReactNode;
  pricing: ReactNode;
  storefront: ReactNode;
}

function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      role="region"
      aria-labelledby={id}
      className="min-w-0 rounded-card-sm border border-border bg-card p-4 sm:p-6"
    >
      <header className="mb-4">
        <h2 id={id} className="text-base font-semibold text-foreground">
          <Trans message={title} />
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          <Trans message={description} />
        </p>
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function DigitalProductEditor({
  details,
  files,
  sample,
  pricing,
  storefront,
}: DigitalProductEditorProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="digital-product-editor">
      <EditorSection
        id="digital-product-details"
        title="Product details"
        description="Tell customers what is included and show a clear cover image."
      >
        {details}
      </EditorSection>

      <EditorSection
        id="digital-product-files"
        title="Files buyers receive"
        description="These downloadable files stay private until a purchase is verified."
      >
        {files}
      </EditorSection>

      <EditorSection
        id="digital-product-sample"
        title="Sample PDF (optional)"
        description="Offer a PDF preview before purchase. Your full files remain private."
      >
        {sample}
      </EditorSection>

      <EditorSection
        id="digital-product-pricing"
        title="Price"
        description="Choose free access or set a one-time price in ETB."
      >
        {pricing}
      </EditorSection>

      <EditorSection
        id="digital-product-storefront"
        title="Storefront placement (optional)"
        description="Choose where this product appears after approval."
      >
        {storefront}
      </EditorSection>
    </div>
  );
}
