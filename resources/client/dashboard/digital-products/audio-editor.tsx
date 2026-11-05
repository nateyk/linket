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
    <div className="flex min-w-0 flex-col gap-4" data-testid="audio-editor">
      <ProductEditorSection
        id="audio-information"
        title={<Trans message="Audio information" />}
        description={<Trans message="Describe the audio and add a cover." />}
      >
        {details}
      </ProductEditorSection>
      <ProductEditorSection
        id="audio-private-files"
        title={<Trans message="Full audio files" />}
        description={<Trans message="Upload MP3, M4A or WAV tracks that buyers receive. Paid full tracks remain private until a purchase is verified." />}
      >
        {files}
      </ProductEditorSection>
      <ProductEditorSection
        id="audio-public-clips"
        title={<Trans message="Preview clips (optional)" />}
        description={<Trans message="Offer up to 8 short preview clips before purchase, each with its own title and order." />}
      >
        {sample}
      </ProductEditorSection>
      <ProductEditorSection
        id="audio-pricing"
        title={<Trans message="Price" />}
        description={<Trans message="Choose free access or set a one-time price in ETB." />}
      >
        {pricing}
      </ProductEditorSection>
      <ProductEditorSection
        id="audio-storefront"
        title={<Trans message="Storefront placement (optional)" />}
        description={<Trans message="Choose where your audio appears after approval." />}
      >
        {storefront}
      </ProductEditorSection>
    </div>
  );
}
