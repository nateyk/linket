import {Field} from '@shadcn/forms/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@shadcn/forms/input-group/input-group';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {
  PackagePlusIcon,
  TagIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';
import {useState} from 'react';
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

export function useProductCreateWizard() {
  const [step, setStep] = useState<WizardStep>('type');
  const [state, setState] = useState<WizardState>(INITIAL_WIZARD_STATE);
  const steps = visibleSteps(state.billing);

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
  };

  return {
    step,
    steps,
    type: state.type,
    billing: state.billing,
    price: state.price,
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

export function WizardStepDots({wizard}: {wizard: ProductCreateWizard}) {
  const current = wizard.steps.indexOf(wizard.step);
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      {wizard.steps.map(step => (
        <span
          key={step}
          className={cn(
            'size-1.5 rounded-full',
            step === wizard.step ? 'bg-primary' : 'bg-border',
          )}
        />
      ))}
      <span className="sr-only">
        <Trans
          message="Step :current of :total"
          values={{current: current + 1, total: wizard.steps.length}}
        />
      </span>
    </span>
  );
}

export function WizardStepBody({wizard}: {wizard: ProductCreateWizard}) {
  if (wizard.step === 'billing') {
    return (
      <BillingModePicker value={wizard.billing} onValueChange={wizard.setBilling} />
    );
  }
  if (wizard.step === 'price') {
    const showHint =
      wizard.price.trim() !== '' &&
      (parseEtbToCents(wizard.price) === null ||
        (parseEtbToCents(wizard.price) ?? 0) <= 0);
    return (
      <Field.Root>
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
            onChange={event => wizard.setPrice(event.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </InputGroup>
        {showHint && (
          <p className="text-sm text-destructive">
            <Trans message="Enter an amount greater than ETB 0." />
          </p>
        )}
      </Field.Root>
    );
  }
  return (
    <ProductTypePicker value={wizard.type} onValueChange={wizard.setType} />
  );
}
