/**
 * @vitest-environment jsdom
 */
import {HookForm} from '@shadcn/forms/form/hook-form';
import {render, screen} from '@testing-library/react';
import {useForm} from 'react-hook-form';
import {expect, test} from 'vitest';
import {CrupdatePlanForm, CrupdatePlanFormValues} from './crupdate-plan-form';

function FormHarness() {
  const form = useForm<CrupdatePlanFormValues>({
    defaultValues: {
      name: '',
      free: false,
      active: true,
      recommended: false,
      hidden: false,
      is_default: false,
      position: 0,
      trial_period_days: 0,
      feature_list: [],
      storefront_benefits: {
        max_free_products: 5,
        max_paid_products: 5,
        max_upload_bytes: 1073741824,
        max_storefronts: 1,
        max_workspaces: 1,
      },
      prices: [],
    },
  });

  return (
    <HookForm.Root form={form} onSubmit={() => {}}>
      <CrupdatePlanForm />
    </HookForm.Root>
  );
}

test('plan editor keeps product limits without the retired verified-sales allowance', () => {
  render(<FormHarness />);

  expect(screen.queryByText('Lifetime Free verified sales')).toBeNull();
  expect(screen.getByText('Free products')).toBeTruthy();
  expect(screen.getByText('Paid products')).toBeTruthy();
});
