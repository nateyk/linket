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
        active={activeStep === undefined || activeStep === 'details'}
        id="ebook-information"
        title={<Trans message="Book information" />}
        description={
          <Trans message="Book title, description, and cover shown to readers." />
        }
      >
        {details}
      </ProductEditorSection>
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'files'}
        id="ebook-private-files"
        title={<Trans message="Book files" />}
        description={
          <Trans message="Private EPUB or PDF files unlocked after purchase." />
        }
      >
        {files}
      </ProductEditorSection>
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'files'}
        id="ebook-public-sample"
        title={<Trans message="Sample pages (optional)" />}
        description={
          <Trans message="Optional public PDF sample so readers can preview pages." />
        }
      >
        {sample}
      </ProductEditorSection>
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'pricing'}
        id="ebook-pricing"
        title={<Trans message="Price" />}
        description={
          <Trans message="Offer free access or set a book price in ETB." />
        }
      >
        {pricing}
      </ProductEditorSection>
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'storefront'}
        id="ebook-storefront"
        title={<Trans message="Storefront placement (optional)" />}
        description={
          <Trans message="Choose which storefronts feature this e-book once approved." />
        }
      >
        {storefront}
      </ProductEditorSection>
    </div>
  );
}
