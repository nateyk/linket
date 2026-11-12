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
    <div className="flex min-w-0 flex-col gap-3 sm:gap-4" data-testid="digital-product-editor">
      <ProductEditorSection
        id="digital-product-details"
        title={<Trans message="Product details" />}
      >
        {details}
      </ProductEditorSection>

      <ProductEditorSection
        id="digital-product-files"
        title={<Trans message="Files buyers receive" />}
      >
        {files}
      </ProductEditorSection>

      <ProductEditorSection
        id="digital-product-sample"
        title={<Trans message="Sample PDF (optional)" />}
      >
        {sample}
      </ProductEditorSection>

      <ProductEditorSection
        id="digital-product-pricing"
        title={<Trans message="Price" />}
      >
        {pricing}
      </ProductEditorSection>

      <ProductEditorSection
        id="digital-product-storefront"
        title={<Trans message="Storefront placement (optional)" />}
      >
        {storefront}
      </ProductEditorSection>
    </div>
  );
}
