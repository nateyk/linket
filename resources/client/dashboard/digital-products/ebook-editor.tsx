import {Trans} from '@ui/i18n/trans';
import type {ReactNode} from 'react';
import {ProductEditorSection} from './product-editor-section';

/** Ebook editor: layout only; parent retains saves, uploads and server validation. */
export interface EbookEditorProps {
  details: ReactNode;
  files: ReactNode;
  sample: ReactNode;
  pricing: ReactNode;
  storefront: ReactNode;
}

export function EbookEditor({details, files, sample, pricing, storefront}: EbookEditorProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:gap-4" data-testid="ebook-editor">
      <ProductEditorSection
        id="ebook-information"
        title={<Trans message="Book information" />}
      >
        {details}
      </ProductEditorSection>
      <ProductEditorSection
        id="ebook-private-files"
        title={<Trans message="Book files" />}
      >
        {files}
      </ProductEditorSection>
      <ProductEditorSection
        id="ebook-public-sample"
        title={<Trans message="Sample pages (optional)" />}
      >
        {sample}
      </ProductEditorSection>
      <ProductEditorSection
        id="ebook-pricing"
        title={<Trans message="Price" />}
      >
        {pricing}
      </ProductEditorSection>
      <ProductEditorSection
        id="ebook-storefront"
        title={<Trans message="Storefront placement (optional)" />}
      >
        {storefront}
      </ProductEditorSection>
    </div>
  );
}
