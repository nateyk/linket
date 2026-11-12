import {Trans} from '@ui/i18n/trans';
import type {ReactNode} from 'react';
import {ProductEditorSection} from './product-editor-section';

/** Audio editor: layout only; parent retains saves, uploads and server validation. */
export interface AudioEditorProps {
  details: ReactNode;
  files: ReactNode;
  sample: ReactNode;
  pricing: ReactNode;
  storefront: ReactNode;
}

export function AudioEditor({details, files, sample, pricing, storefront}: AudioEditorProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:gap-4" data-testid="audio-editor">
      <ProductEditorSection
        id="audio-information"
        title={<Trans message="Audio information" />}
      >
        {details}
      </ProductEditorSection>
      <ProductEditorSection
        id="audio-private-files"
        title={<Trans message="Full audio files" />}
      >
        {files}
      </ProductEditorSection>
      <ProductEditorSection
        id="audio-public-clips"
        title={<Trans message="Preview clips (optional)" />}
      >
        {sample}
      </ProductEditorSection>
      <ProductEditorSection
        id="audio-pricing"
        title={<Trans message="Price" />}
      >
        {pricing}
      </ProductEditorSection>
      <ProductEditorSection
        id="audio-storefront"
        title={<Trans message="Storefront placement (optional)" />}
      >
        {storefront}
      </ProductEditorSection>
    </div>
  );
}
