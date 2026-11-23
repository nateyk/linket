import type {LandingPageImageConfig} from '@common/ui/landing-page/landing-page-config';

// Existing local artwork is temporary: admins can replace each image directly
// from the journey step editor after enabling the illustrated layout.
const creatorJourneyImages: LandingPageImageConfig[] = [
  {src: 'images/landing/creator-storefront.svg', width: 1280, height: 880},
  {src: 'images/landing/creator-hero.svg', width: 1280, height: 880},
  {src: 'images/landing/creator-checkout.svg', width: 1280, height: 880},
];

type StepWithOptionalImage = {image?: LandingPageImageConfig};

export function getMissingCreatorJourneyImages(
  steps: StepWithOptionalImage[],
): {index: number; image: LandingPageImageConfig}[] {
  return steps.slice(0, creatorJourneyImages.length).flatMap((step, index) =>
    step.image?.src ? [] : [{index, image: creatorJourneyImages[index]}],
  );
}
