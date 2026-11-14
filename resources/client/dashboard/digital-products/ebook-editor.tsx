import {Trans} from '@ui/i18n/trans';
import type {ReactNode} from 'react';
import type {ProductAuthoringStep} from './product-authoring-steps';
import {ProductEditorSection} from './product-editor-section';

/** Ebook editor: layout only; parent retains saves, uploads and server validation. */
export interface EbookEditorProps {
  details: ReactNode;
  files: ReactNode;
  sample: ReactNode;
  pricing: ReactNode;
  storefront: ReactNode;
  activeStep?: ProductAuthoringStep;
}

export function EbookEditor({details, files, sample, pricing, storefront, activeStep}: EbookEditorProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:gap-4" data-testid="ebook-editor">
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'details,details'}
        id="ebook-information"
        title={<Trans message="Book information" />}
      >
        {details}
      </ProductEditorSection>
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'files,files'}
        id="ebook-private-files"
        title={<Trans message="Book files" />}
      >
        {files}
      </ProductEditorSection>
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'sample,files'}
        id="ebook-public-sample"
        title={<Trans message="Sample pages (optional)" />}
      >
        {sample}
      </ProductEditorSection>
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'pricing,pricing'}
        id="ebook-pricing"
        title={<Trans message="Price" />}
      >
        {pricing}
      </ProductEditorSection>
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'storefront,storefront'}
        id="ebook-storefront"
        title={<Trans message="Storefront placement (optional)" />}
      >
        {storefront}
      </ProductEditorSection>
    </div>
  );
}
