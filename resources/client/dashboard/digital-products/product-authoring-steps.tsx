import {Button} from '@shadcn/button/button';
import {Separator} from '@shadcn/separator';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {CheckIcon} from 'lucide-react';

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
 * Uses the same connected Base UI/shadcn navigation pattern as Service Creator.
 * All fields remain mounted. Navigation scrolls and focuses its section so an
 * upload in progress, draft edit, or validation error is never discarded.
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
    {id: 'details', label: trans({message: 'Details'}), help: trans({message: 'Title, description and cover.'})},
    {id: 'files', label: trans({message: 'Files'}), help: trans({message: 'Private files buyers receive.'})},
    {id: 'sample', label: trans({message: 'Sample'}), help: trans({message: 'Optional public preview.'})},
    {id: 'pricing', label: trans({message: 'Price'}), help: trans({message: 'Free access or paid price.'})},
    {id: 'storefront', label: trans({message: 'Storefront'}), help: trans({message: 'Optional Storefront placement.'})},
  ] as const;
  const activeIndex = PRODUCT_AUTHORING_STEP_ORDER.indexOf(active);

  return (
    <nav
      aria-label={trans({message: 'Product creation steps'})}
      data-testid="product-authoring-steps"
      className="min-w-0 scroll-mt-20 border-b pb-3 xl:sticky xl:top-4 xl:self-start xl:border-b-0 xl:border-e xl:pb-0 xl:pe-4"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{trans({message: 'Product setup'})}</p>
        <span className="text-xs tabular-nums text-muted-foreground">
          {trans({message: 'Step :current of :total', values: {current: activeIndex + 1, total: steps.length}})}
        </span>
      </div>
      <ol className="grid min-w-0 grid-cols-5 gap-0 xl:grid-cols-1">
        {steps.map((step, index) => {
          const current = active === step.id;
          const done = completed[step.id];
          return (
            <li key={step.id} className="relative min-w-0">
              {index < steps.length - 1 && (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute start-1/2 -end-1/2 top-6 h-px xl:hidden',
                      done ? 'bg-positive/60' : 'bg-border',
                    )}
                  />
                  <Separator
                    orientation="vertical"
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute start-6 top-7 -bottom-7 hidden xl:block',
                      done ? 'bg-positive/60' : 'bg-border',
                    )}
                  />
                </>
              )}
              <Button
                type="button"
                size="lg"
                color="default"
                variant="ghost"
                aria-current={current ? 'step' : undefined}
                aria-controls={TARGET_IDS[type][step.id]}
                aria-label={trans({
                  message: ':name, step :index of :total',
                  values: {name: step.label, index: index + 1, total: steps.length},
                })}
                data-step-state={current ? 'current' : index < activeIndex ? 'previous' : 'upcoming'}
                data-step-complete={done ? 'true' : 'false'}
                onClick={() => onSelect(step.id)}
                className="relative flex h-auto min-h-16 w-full min-w-0 flex-col items-center justify-start gap-1 rounded-card-xs px-0.5 py-2 text-center text-foreground whitespace-normal hover:bg-muted/40 motion-reduce:transition-none sm:px-2 xl:flex-row xl:items-start xl:justify-start xl:gap-3 xl:py-3 xl:text-start"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                    done
                      ? 'border-positive bg-positive text-primary-foreground'
                      : current
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {done ? <CheckIcon className="size-4" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn(
                    'block break-words text-xs leading-4 sm:text-sm sm:leading-5',
                    current ? 'font-semibold text-primary' : done ? 'font-medium text-foreground' : 'font-medium text-muted-foreground',
                  )}>
                    {step.label}
                  </span>
                  <span className="mt-0.5 hidden text-xs leading-4 text-muted-foreground xl:block">
                    {step.help}
                  </span>
                </span>
              </Button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Move to an already-mounted section without losing form state. */
export function focusProductAuthoringStep(
  type: NonCourseProductType,
  step: ProductAuthoringStep,
) {
  const heading = document.getElementById(TARGET_IDS[type][step]);
  heading?.scrollIntoView({block: 'start', behavior: 'auto'});
  heading?.focus({preventScroll: true});
}
