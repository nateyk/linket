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
    <div className="flex min-w-0 flex-col gap-4" data-testid="ebook-editor">
      <ProductEditorSection
        id="ebook-information"
        title={<Trans message="Book information" />}
        description={<Trans message="Add the book's title, description and cover." />}
      >
        {details}
      </ProductEditorSection>
      <ProductEditorSection
        id="ebook-private-files"
        title={<Trans message="Book files" />}
        description={<Trans message="Upload a PDF or EPUB book file. Either format is enough; add both only if you want. Full book files remain private." />}
      >
        {files}
      </ProductEditorSection>
      <ProductEditorSection
        id="ebook-public-sample"
        title={<Trans message="Sample pages (optional)" />}
        description={<Trans message="Share a separate PDF sample before purchase; the full book remains private." />}
      >
        {sample}
      </ProductEditorSection>
      <ProductEditorSection
        id="ebook-pricing"
        title={<Trans message="Price" />}
        description={<Trans message="Choose free access or set a one-time price in ETB." />}
      >
        {pricing}
      </ProductEditorSection>
      <ProductEditorSection
        id="ebook-storefront"
        title={<Trans message="Storefront placement (optional)" />}
        description={<Trans message="Choose where your book appears after approval." />}
      >
        {storefront}
      </ProductEditorSection>
    </div>
  );
}
