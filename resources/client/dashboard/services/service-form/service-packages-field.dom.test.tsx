/** @vitest-environment jsdom */
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, expect, it} from 'vitest';
import {formatMoney} from '@ui/i18n/format-money';
import {ServicePackagesField} from './service-packages-field';
import type {ServiceFormPackage} from '../service-form-state';

const pkg = (
  overrides: Partial<ServiceFormPackage> = {},
): ServiceFormPackage => ({
  name: 'Basic',
  description: '',
  price: '',
  delivery_days: '',
  revisions: '',
  features: '',
  ...overrides,
});

function renderField(
  initial: ServiceFormPackage[],
  errors: Record<string, string> = {},
) {
  const changes: ServiceFormPackage[][] = [];

  function Host() {
    const [packages, setPackages] = useState(initial);
    return (
      <ServicePackagesField
        packages={packages}
        errors={errors}
        onChange={next => {
          changes.push(next);
          setPackages(next);
        }}
      />
    );
  }
  render(<Host />);
  return {changes};
}

describe('Service Creation fixed package tiers', () => {
  it('always shows Basic, Standard and Premium but no custom tier name or Add Package controls', () => {
    const {changes} = renderField([]);
    for (const name of ['Basic', 'Standard', 'Premium']) {
      const tier = screen.getByRole('region', {name: name + ' package'});
      expect(tier).toBeTruthy();
      expect(within(tier).getByRole('switch', {name: 'Enable ' + name + ' package'}).getAttribute('aria-checked')).toBe('false');
    }
    expect(screen.queryByRole('button', {name: 'Add package'})).toBeNull();
    expect(screen.queryByRole('textbox', {name: 'Package name'})).toBeNull();
    expect(screen.getByText('0 of 3 enabled')).toBeTruthy();
    expect(changes).toHaveLength(0);
  });

  it('shows three quiet summaries but only one editable tier at a time', async () => {
    const user = userEvent.setup();
    renderField([
      pkg({name: 'Basic', price: '150'}),
      pkg({name: 'Standard', price: '300'}),
      pkg({name: 'Premium', price: '550'}),
    ]);
    expect(screen.getByRole('region', {name: 'Basic package details'})).toBeTruthy();
    expect(screen.queryByRole('region', {name: 'Standard package details'})).toBeNull();
    expect(screen.getByRole('button', {name: 'Edit Basic package'}).getAttribute('aria-pressed')).toBe('true');

    await user.click(screen.getByRole('button', {name: 'Edit Premium package'}));
    expect(screen.getByRole('region', {name: 'Premium package details'})).toBeTruthy();
    expect(screen.queryByRole('region', {name: 'Basic package details'})).toBeNull();
    expect(screen.getByRole('button', {name: 'Edit Premium package'}).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('textbox', {name: 'Price'})).toHaveLength(1);
  });

  it('keeps optional description hidden until requested, without losing existing text', async () => {
    const user = userEvent.setup();
    renderField([pkg({name: 'Basic'})]);
    expect(screen.queryByRole('textbox', {name: 'Package description'})).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Add package description'}));
    await user.type(screen.getByRole('textbox', {name: 'Package description'}), 'Includes source files');
    await user.click(screen.getByRole('button', {name: 'Edit Standard package'}));
    await user.click(screen.getByRole('button', {name: 'Edit Basic package'}));
    expect(screen.getByRole('textbox', {name: 'Package description'})).toHaveProperty('value', 'Includes source files');
  });

  it('enables Standard directly with its fixed name, without adding Basic', async () => {
    const {changes} = renderField([]);
    await userEvent.click(screen.getByRole('switch', {name: 'Enable Standard package'}));
    expect(changes[0]).toEqual([pkg({name: 'Standard'})]);
    expect(screen.getByText('1 of 3 enabled')).toBeTruthy();
    expect(screen.queryByRole('textbox', {name: 'Package name'})).toBeNull();
  });

  it('edits pricing, delivery, revisions and description inside the enabled tier', async () => {
    const user = userEvent.setup();
    const {changes} = renderField([]);
    await user.click(screen.getByRole('switch', {name: 'Enable Basic package'}));
    const basic = screen.getByRole('region', {name: 'Basic package details'});
    await user.type(within(basic).getByRole('textbox', {name: 'Price'}), '299');
    await user.type(within(basic).getByRole('textbox', {name: 'Delivery days'}), '5');
    await user.type(within(basic).getByRole('textbox', {name: 'Revisions'}), '2');
    await user.click(within(basic).getByRole('button', {name: 'Add package description'}));
    await user.type(within(basic).getByRole('textbox', {name: 'Package description'}), 'One logo concept');

    expect(changes.at(-1)?.[0]).toMatchObject({
      name: 'Basic',
      price: '299',
      delivery_days: '5',
      revisions: '2',
      description: 'One logo concept',
    });
    expect(within(screen.getByRole('region', {name: 'Basic package'})).getByText(formatMoney(29900, 'ETB'))).toBeTruthy();
  });

  it('removes only the disabled tier and restores its unsaved inputs on reenable', async () => {
    const user = userEvent.setup();
    const {changes} = renderField([pkg({name: 'Basic', price: '120'})]);
    await user.click(screen.getByRole('switch', {name: 'Enable Standard package'}));
    const standard = screen.getByRole('region', {name: 'Standard package details'});
    await user.type(within(standard).getByRole('textbox', {name: 'Price'}), '399');
    await user.click(screen.getByRole('switch', {name: 'Enable Standard package'}));
    expect(changes.at(-1)).toEqual([pkg({name: 'Basic', price: '120'})]);
    await user.click(screen.getByRole('switch', {name: 'Enable Standard package'}));
    expect(changes.at(-1)).toEqual([
      pkg({name: 'Basic', price: '120'}),
      pkg({name: 'Standard', price: '399'}),
    ]);
  });

  it('keeps enabled plans in Basic / Standard / Premium order regardless of toggle order', async () => {
    const user = userEvent.setup();
    const {changes} = renderField([]);
    await user.click(screen.getByRole('switch', {name: 'Enable Premium package'}));
    await user.click(screen.getByRole('switch', {name: 'Enable Basic package'}));
    await user.click(screen.getByRole('switch', {name: 'Enable Standard package'}));
    expect(changes.at(-1)?.map(item => item.name)).toEqual(['Basic', 'Standard', 'Premium']);
  });

  it('adds a shared included feature and selects it per enabled tier', async () => {
    const user = userEvent.setup();
    const {changes} = renderField([
      pkg({name: 'Basic', features: 'One concept'}),
      pkg({name: 'Standard', features: 'One concept'}),
    ]);
    await user.type(screen.getByRole('textbox', {name: 'Add an included feature'}), 'Vector source files');
    await user.click(screen.getByRole('button', {name: 'Add feature'}));
    expect(screen.getByRole('checkbox', {name: 'Include Vector source files in Basic'}).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', {name: 'Include Vector source files in Standard'}).getAttribute('aria-checked')).toBe('false');
    await user.click(screen.getByRole('checkbox', {name: 'Include Vector source files in Standard'}));
    expect(changes.at(-1)?.[1].features).toBe('One concept\nVector source files');
    const premiumFeature = screen.getByRole('checkbox', {name: 'Include Vector source files in Premium'});
    expect(
      premiumFeature.hasAttribute('data-disabled') ||
      premiumFeature.getAttribute('aria-disabled') === 'true',
    ).toBe(true);
  });

  it('removes a shared feature from every enabled tier', async () => {
    const user = userEvent.setup();
    const {changes} = renderField([
      pkg({name: 'Basic', features: 'Source files\nPNG'}),
      pkg({name: 'Standard', features: 'Source files'}),
    ]);
    await user.click(screen.getByRole('button', {name: 'Remove feature Source files'}));
    expect(changes.at(-1)?.map(item => item.features)).toEqual(['PNG', '']);
    expect(screen.queryByRole('button', {name: 'Remove feature Source files'})).toBeNull();
  });

  it('requires an enabled tier before adding included features', () => {
    renderField([]);
    expect(screen.getByRole('textbox', {name: 'Add an included feature'}).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', {name: 'Add feature'}).hasAttribute('disabled')).toBe(true);
  });

  it('shows the tier with a validation error even when another tier was selected', async () => {
    const user = userEvent.setup();
    function Host() {
      const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
      return (
        <>
          <button type="button" onClick={() => setFieldErrors({'packages.1.delivery_days': 'Delivery is invalid.'})}>
            Trigger validation
          </button>
          <ServicePackagesField
            packages={[pkg({name: 'Basic'}), pkg({name: 'Standard'})]}
            errors={fieldErrors}
            onChange={() => {}}
          />
        </>
      );
    }
    render(<Host />);
    expect(screen.getByRole('region', {name: 'Basic package details'})).toBeTruthy();
    await user.click(screen.getByRole('button', {name: 'Trigger validation'}));
    expect(screen.getByRole('region', {name: 'Standard package details'})).toBeTruthy();
    expect(screen.getByText('Delivery is invalid.')).toBeTruthy();
  });

  it('shows backend price validation on the correct enabled tier', () => {
    renderField([pkg({name: 'Standard', price: 'invalid'})], {
      'packages.0.price_cents': 'Enter a valid price.',
    });
    const standard = screen.getByRole('region', {name: 'Standard package details'});
    expect(within(standard).getByText('Enter a valid price.')).toBeTruthy();
    expect(within(standard).getByRole('textbox', {name: 'Price'}).getAttribute('id')).toBe('packages.0.price_cents');
  });

  it('maps older Starter packages to Basic without deleting their saved ID or fields', async () => {
    const user = userEvent.setup();
    const {changes} = renderField([pkg({id: 18, name: 'Starter', price: '249', features: 'Logo files'})]);
    const basic = screen.getByRole('region', {name: 'Basic package details'});
    expect(within(basic).getByText('Previously: Starter')).toBeTruthy();
    await user.click(screen.getByRole('switch', {name: 'Enable Premium package'}));
    expect(changes.at(-1)?.[0]).toMatchObject({id: 18, name: 'Basic', price: '249', features: 'Logo files'});
  });

  it('preserves additional existing packages until the creator explicitly removes one', async () => {
    const user = userEvent.setup();
    const initial = [
      pkg({id: 1, name: 'Starter'}),
      pkg({id: 2, name: 'Standard'}),
      pkg({id: 3, name: 'Premium'}),
      pkg({id: 4, name: 'Legacy offer', price: '400'}),
    ];
    const {changes} = renderField(initial);
    expect(screen.getByRole('region', {name: 'Older packages'})).toBeTruthy();
    await user.click(screen.getByRole('switch', {name: 'Enable Standard package'}));
    expect(changes.at(-1)?.find(item => item.id === 4)).toMatchObject(initial[3]);
    await user.click(screen.getByRole('button', {name: 'Remove older package Legacy offer'}));
    expect(changes.at(-1)?.find(item => item.id === 4)).toBeUndefined();
  });

  it('does not promote a legacy package when the last fixed tier is disabled', async () => {
    const user = userEvent.setup();
    const {changes} = renderField([
      pkg({id: 1, name: 'Basic'}),
      pkg({id: 2, name: 'Standard'}),
      pkg({id: 3, name: 'Premium'}),
      pkg({id: 4, name: 'Older design offer'}),
    ]);
    await user.click(screen.getByRole('switch', {name: 'Enable Basic package'}));
    await user.click(screen.getByRole('switch', {name: 'Enable Standard package'}));
    await user.click(screen.getByRole('switch', {name: 'Enable Premium package'}));
    expect(screen.getByText('0 of 3 enabled')).toBeTruthy();
    expect(screen.getByRole('region', {name: 'Older packages'})).toBeTruthy();
    expect(changes.at(-1)?.map(item => item.id)).toEqual([4]);
  });

  it('does not silently drop a fully filled Premium tier when enabling another', async () => {
    const {changes} = renderField([pkg({id: 3, name: 'Premium', price: '800', delivery_days: '10'})]);
    await userEvent.click(screen.getByRole('switch', {name: 'Enable Basic package'}));
    expect(changes.at(-1)).toEqual([
      pkg({name: 'Basic'}),
      pkg({id: 3, name: 'Premium', price: '800', delivery_days: '10'}),
    ]);
  });

  it('prevents duplicate shared feature names', async () => {
    const user = userEvent.setup();
    renderField([pkg({name: 'Basic', features: 'PNG files'})]);
    await user.type(screen.getByRole('textbox', {name: 'Add an included feature'}), 'png files');
    await user.click(screen.getByRole('button', {name: 'Add feature'}));
    expect(screen.getByRole('alert').textContent).toContain('This feature already exists.');
  });
});
