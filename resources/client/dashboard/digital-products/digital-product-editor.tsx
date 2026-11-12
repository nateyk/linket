import {Trans} from '@ui/i18n/trans';
import type {ReactNode} from 'react';
import {ProductEditorSection} from './product-editor-section';

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

export function DigitalProductEditor({
  details,
  files,
  sample,
  pricing,
  storefront,
}: DigitalProductEditorProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="digital-product-editor">
      <ProductEditorSection
        id="digital-product-details"
        title={<Trans message="Product details" />}
        description={<Trans message="Tell customers what is included and show a clear cover image." />}
      >
        {details}
      </ProductEditorSection>

      <ProductEditorSection
        id="digital-product-files"
        title={<Trans message="Files buyers receive" />}
        description={<Trans message="These downloadable files stay private until a purchase is verified." />}
      >
        {files}
      </ProductEditorSection>

      <ProductEditorSection
        id="digital-product-sample"
        title={<Trans message="Sample PDF (optional)" />}
        description={<Trans message="Offer a PDF preview before purchase. Your full files remain private." />}
      >
        {sample}
      </ProductEditorSection>

      <ProductEditorSection
        id="digital-product-pricing"
        title={<Trans message="Price" />}
        description={<Trans message="Choose free access or set a one-time price in ETB." />}
      >
        {pricing}
      </ProductEditorSection>

      <ProductEditorSection
        id="digital-product-storefront"
        title={<Trans message="Storefront placement (optional)" />}
        description={<Trans message="Choose where this product appears after approval." />}
      >
        {storefront}
      </ProductEditorSection>
    </div>
  );
}
