import {CreatorSteps} from '../shared/creator-steps';
import {useTrans} from '@ui/i18n/use-trans';

export const PRODUCT_AUTHORING_STEP_ORDER = [
  'details',
  'files',
  'sample',
  'pricing',
  'storefront',
] as const;

export type ProductAuthoringStep = (typeof PRODUCT_AUTHORING_STEP_ORDER)[number];
export type NonCourseProductType = 'digital' | 'ebook' | 'audio';

const TARGET_IDS: Record<NonCourseProductType, Record<ProductAuthoringStep, string>> = {
  digital: {
    details: 'digital-product-details',
    files: 'digital-product-files',
    sample: 'digital-product-sample',
    pricing: 'digital-product-pricing',
    storefront: 'digital-product-storefront',
  },
  ebook: {
    details: 'ebook-information',
    files: 'ebook-private-files',
    sample: 'ebook-public-sample',
    pricing: 'ebook-pricing',
    storefront: 'ebook-storefront',
  },
  audio: {
    details: 'audio-information',
    files: 'audio-private-files',
    sample: 'audio-public-clips',
    pricing: 'audio-pricing',
    storefront: 'audio-storefront',
  },
};

/**
 * Product creation shares the Service stepper without imposing wizard behavior.
 * Every Product section stays mounted while navigation scrolls and focuses the
 * chosen heading, keeping uploads, unsaved values and validation intact.
 */
export function ProductAuthoringSteps({
  type,
  active,
  completed,
  onSelect,
}: {
  type: NonCourseProductType;
  active: ProductAuthoringStep;
  completed: Record<ProductAuthoringStep, boolean>;
  onSelect: (step: ProductAuthoringStep) => void;
}) {
  const {trans} = useTrans();
  const steps = [
    {id: 'details', title: trans({message: 'Details'}), description: trans({message: 'Title, description and cover.'})},
    {id: 'files', title: trans({message: 'Files'}), description: trans({message: 'Private files buyers receive.'})},
    {id: 'sample', title: trans({message: 'Sample'}), description: trans({message: 'Optional public preview.'})},
    {id: 'pricing', title: trans({message: 'Price'}), description: trans({message: 'Free access or paid price.'})},
    {id: 'storefront', title: trans({message: 'Storefront'}), description: trans({message: 'Optional Storefront placement.'})},
  ] as const;

  return (
    <CreatorSteps
      ariaLabel={trans({message: 'Product creation steps'})}
      testId="product-authoring-steps"
      columns="grid-cols-5"
      steps={steps}
      active={active}
      completed={completed}
      onSelect={onSelect}
      targetIds={TARGET_IDS[type]}
    />
  );
}

/**
 * Scroll only the dashboard editor. scrollIntoView() also scrolls the document
 * and can push the entire fixed-height dashboard above the viewport, leaving
 * a large blank area below it after selecting a step.
 */
export function focusProductAuthoringStep(
  type: NonCourseProductType,
  step: ProductAuthoringStep,
) {
  const heading = document.getElementById(TARGET_IDS[type][step]);
  if (!heading) return;

  const editorScroll = heading.closest<HTMLElement>('[data-slot="section-content"]');
  if (editorScroll) {
    const offset = heading.getBoundingClientRect().top -
      editorScroll.getBoundingClientRect().top;
    editorScroll.scrollTo({
      top: editorScroll.scrollTop + offset - 16,
      behavior: 'auto',
    });
  }
  heading.focus({preventScroll: true});
}
