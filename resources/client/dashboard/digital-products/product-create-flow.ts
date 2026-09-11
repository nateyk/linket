import type {ProductType} from './product-type-picker';

export type BillingMode = 'free' | 'paid';
export type WizardStep = 'type' | 'billing' | 'price';

export interface WizardState {
  type: ProductType | null;
  billing: BillingMode | null;
  price: string;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  type: null,
  billing: null,
  price: '',
};

export function parseEtbToCents(value: string): number | null {
  if (!value.trim()) return null;
  const cents = Math.round(Number(value) * 100);
  if (!Number.isFinite(cents) || cents < 0) return null;
  return cents;
}

export function initialPriceFromParam(param: string | null): string | null {
  if (param === null || param === '') return null;
  const cents = Number(param);
  if (!Number.isInteger(cents) || cents <= 0) return null;
  return String(cents / 100);
}

export function visibleSteps(billing: BillingMode | null): WizardStep[] {
  return billing === 'paid' ? ['type', 'billing', 'price'] : ['type', 'billing'];
}

export function nextStep(
  step: WizardStep,
  billing: BillingMode | null,
): WizardStep | null {
  if (step === 'type') return 'billing';
  if (step === 'billing') return billing === 'paid' ? 'price' : null;
  return null;
}

export function prevStep(step: WizardStep): WizardStep | null {
  if (step === 'billing') return 'type';
  if (step === 'price') return 'billing';
  return null;
}

export function hasNextStep(
  step: WizardStep,
  billing: BillingMode | null,
): boolean {
  return nextStep(step, billing) !== null;
}

export function canContinue(step: WizardStep, state: WizardState): boolean {
  if (step === 'type') return state.type !== null;
  if (step === 'billing') return state.billing !== null;
  const cents = parseEtbToCents(state.price);
  return cents !== null && cents > 0;
}

export function buildCreateUrl(state: WizardState): string | null {
  if (state.type === null || state.billing === null) return null;
  const cents =
    state.billing === 'paid' ? parseEtbToCents(state.price) : 0;
  if (cents === null || cents < 0) return null;
  if (state.billing === 'paid' && cents === 0) return null;
  if (state.type === 'course') {
    return `/dashboard/my-products/new/course${
      state.billing === 'paid' ? `?price_cents=${cents}` : ''
    }`;
  }
  return `/dashboard/my-products/new/details?type=${state.type}${
    state.billing === 'paid' ? `&price_cents=${cents}` : ''
  }`;
}
