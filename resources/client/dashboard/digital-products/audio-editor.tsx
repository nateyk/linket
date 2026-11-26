import {Trans} from '@ui/i18n/trans';
import type {ReactNode} from 'react';
import type {ProductAuthoringStep} from './product-authoring-steps';
import {ProductEditorSection} from './product-editor-section';

/** Audio editor: layout only; parent retains saves, uploads and server validation. */
export interface AudioEditorProps {
  details: ReactNode;
  files: ReactNode;
  sample: ReactNode;
  pricing: ReactNode;
  storefront: ReactNode;
  activeStep?: ProductAuthoringStep;
}

export function AudioEditor({details, files, sample, pricing, storefront, activeStep}: AudioEditorProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:gap-4" data-testid="audio-editor">
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'details'}
        id="audio-information"
        title={<Trans message="Audio information" />}
        description={
          <Trans message="Audio title, description, and cover artwork for listeners." />
        }
      >
        {details}
      </ProductEditorSection>
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'files'}
        id="audio-private-files"
        title={<Trans message="Full audio files" />}
        description={
          <Trans message="Private audio tracks or archives unlocked after purchase." />
        }
      >
        {files}
      </ProductEditorSection>
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'files'}
        id="audio-public-clips"
        title={<Trans message="Preview clips (optional)" />}
        description={
          <Trans message="Optional public audio clips listeners can sample before buying." />
        }
      >
        {sample}
      </ProductEditorSection>
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'pricing'}
        id="audio-pricing"
        title={<Trans message="Price" />}
        description={
          <Trans message="Offer free access or set an audio price in ETB." />
        }
      >
        {pricing}
      </ProductEditorSection>
      <ProductEditorSection
        active={activeStep === undefined || activeStep === 'storefront'}
        id="audio-storefront"
        title={<Trans message="Storefront placement (optional)" />}
        description={
          <Trans message="Choose which storefronts feature this audio once approved." />
        }
      >
        {storefront}
      </ProductEditorSection>
    </div>
  );
}
