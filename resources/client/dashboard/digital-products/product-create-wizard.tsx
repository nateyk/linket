import {Field} from '@shadcn/forms/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@shadcn/forms/input-group/input-group';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  PackagePlusIcon,
  TagIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';
import {useEffect, useState} from 'react';
import {BillingModePicker} from './billing-mode-picker';
import {
  buildCreateUrl,
  canContinue as canContinueStep,
  INITIAL_WIZARD_STATE,
  nextStep,
  parseEtbToCents,
  prevStep,
  visibleSteps,
  type BillingMode,
  type WizardState,
  type WizardStep,
} from './product-create-flow';
import type {ProductType} from './product-type-picker';
import {ProductTypePicker} from './product-type-picker';
import {ProductFormProgress} from './product-form-progress';

export const STEP_META: Record<
  WizardStep,
  {icon: LucideIcon; title: string; description: string}
> = {
  type: {
    icon: PackagePlusIcon,
    title: 'Create a new product',
    description: 'Choose the best format for what you want to sell.',
  },
  billing: {
    icon: WalletIcon,
    title: 'Free or paid?',
    description: 'How will people access this product?',
  },
  price: {
    icon: TagIcon,
    title: 'Set your price',
    description: 'One-time price in ETB. You can change it later.',
  },
};

const STORAGE_KEY = 'productCreateWizard';

export function useProductCreateWizard() {
  const [step, setStep] = useState<WizardStep>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.step ?? 'type';
      } catch {
        return 'type';
      }
    }
    return 'type';
  });
  const [state, setState] = useState<WizardState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.state ?? INITIAL_WIZARD_STATE;
      } catch {
        return INITIAL_WIZARD_STATE;
      }
    }
    return INITIAL_WIZARD_STATE;
  });
  const steps = visibleSteps(state.billing);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({step, state}));
  }, [step, state]);

  const setType = (type: ProductType | null) =>
    setState(current => ({...current, type}));
  const setBilling = (billing: BillingMode | null) =>
    setState(current => {
      if (billing === 'free' && step === 'price') setStep('billing');
      return {...current, billing};
    });
  const setPrice = (price: string) =>
    setState(current => ({...current, price}));
  const goNext = () => {
    const next = nextStep(step, state.billing);
    if (next) setStep(next);
  };
  const goBack = () => {
    const prev = prevStep(step);
    if (prev) setStep(prev);
  };
  const reset = () => {
    setStep('type');
    setState(INITIAL_WIZARD_STATE);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isDirty =
    state.type !== null || state.billing !== null || state.price.trim() !== '';

  return {
    step,
    steps,
    type: state.type,
    billing: state.billing,
    price: state.price,
    isDirty,
    setType,
    setBilling,
    setPrice,
    canContinue: canContinueStep(step, state),
    goNext,
    goBack,
    reset,
    finishUrl: buildCreateUrl(state),
  };
}

export type ProductCreateWizard = ReturnType<typeof useProductCreateWizard>;

/**
 * Focus management for step transitions: when a new step mounts, move focus
 * to its first radio option so keyboard and screen-reader users land inside
 * the new step. Steps with their own autofocused input (price) are left alone.
 */
export function focusWizardStep(node: HTMLDivElement | null) {
  if (!node) return;
  if (node.querySelector('[autofocus]')) return;
  const firstOption = node.querySelector('[role="radio"]');
  if (firstOption instanceof HTMLElement) {
    firstOption.focus({preventScroll: true});
  }
}

/**
 * T5: the wizard's indicator is the SAME ProductFormProgress bar the
 * course-setup and edit pages use (one progress pattern across the flow).
 * P2 (landmark hygiene): a progressbar is not navigation, so the visible bar
 * renders OUTSIDE the nav; the named nav keeps only the sr-only ordered list
 * with each step's accessible name + aria-current (the R07 guarantees).
 * `completed` is the 1-based step the user is on, so the shared copy shows
 * truthful position ("Step 2 of 3", never "2 of 3 complete").
 */
export function WizardStepDots({wizard}: {wizard: ProductCreateWizard}) {
  const current = wizard.steps.indexOf(wizard.step);
  const {trans} = useTrans();
  return (
    <>
      <ProductFormProgress
        completed={current + 1}
        total={wizard.steps.length}
        messageVariant="steps"
      />
      <nav aria-label={trans({message: 'Product creation steps'})}>
        <ol className="sr-only">
          {wizard.steps.map(step => (
            <li key={step} aria-current={step === wizard.step ? 'step' : undefined}>
              <Trans message={STEP_META[step].title} />
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

export function WizardStepBody({wizard}: {wizard: ProductCreateWizard}) {
  if (wizard.step === 'billing') {
    return (
      <BillingModePicker value={wizard.billing} onValueChange={wizard.setBilling} />
    );
  }
  if (wizard.step === 'price') {
    return <PriceField wizard={wizard} />;
  }
  return (
    <ProductTypePicker value={wizard.type} onValueChange={wizard.setType} />
  );
}

/**
 * T7 (crit1-A): `canContinue` keeps Continue disabled until the price is a
 * real amount (> 0), but a greyed-out button with no reason was a silent
 * dead end at the last gate of the funnel — so the same inline Field.Error
 * the course setup page uses (T4) is shown. P2 (T7 review): mounting that
 * error the instant the step opens (autofocused, empty field) announced a
 * validation failure before the creator had typed anything. The error is
 * deferred until the field has been interacted with (typed into or blurred);
 * once interacted, it stays visible whenever the amount can't pass the gate.
 * The price step only renders for paid billing, so free billing is untouched.
 */
function PriceField({wizard}: {wizard: ProductCreateWizard}) {
  const [touched, setTouched] = useState(false);
  const cents = parseEtbToCents(wizard.price);
  const invalid = cents === null || cents <= 0;
  const showError = touched && invalid;
  return (
    <Field.Root invalid={showError}>
      <Field.Label htmlFor="wizard-price">
        <Trans message="Price" />
      </Field.Label>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <InputGroupText>ETB</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id="wizard-price"
          type="number"
          min="0"
          step="0.01"
          value={wizard.price}
          onChange={event => {
            setTouched(true);
            wizard.setPrice(event.target.value);
          }}
          onBlur={() => setTouched(true)}
          placeholder="0.00"
          aria-invalid={showError}
          autoFocus
        />
      </InputGroup>
      {showError && (
        <Field.Error>
          <Trans message="Enter an amount greater than ETB 0." />
        </Field.Error>
      )}
    </Field.Root>
  );
}
