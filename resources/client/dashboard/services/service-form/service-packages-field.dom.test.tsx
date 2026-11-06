/** @vitest-environment jsdom */
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, expect, it} from 'vitest';
import {formatMoney} from '@ui/i18n/format-money';
import {ServicePackagesField} from './service-packages-field';
import type {ServiceFormPackage} from '../service-form-state';

const pkg = (
  overrides: Partial<ServiceFormPackage> = {},
): ServiceFormPackage => ({
  name: 'Starter',
  description: '',
  price: '',
  delivery_days: '',
  revisions: '',
  features: '',
  ...overrides,
});

/**
 * A stateful host, because the field is controlled: adding or removing a
 * package is only observable when the parent feeds the new list back in.
 */
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

describe('service packages field', () => {
  it('starts with a real empty state instead of a blank form', () => {
    const {changes} = renderField([]);

    expect(screen.getByText('No packages yet')).toBeTruthy();
    expect(
      screen.getByRole('button', {name: 'Add Standard package'}),
    ).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Add package'})).toBeTruthy();
    expect(changes).toHaveLength(0);
  });

  it('adds a named package from the empty state', async () => {
    const {changes} = renderField([]);

    await userEvent.click(
      screen.getByRole('button', {name: 'Add Standard package'}),
    );

    expect(changes[0]).toEqual([pkg({name: 'Standard'})]);
  });

  it('summarises a package without showing its form', () => {
    renderField([
      pkg({
        name: 'Starter',
        price: '299',
        delivery_days: '6',
        revisions: '2',
        features: 'One concept\nPNG files',
      }),
    ]);

    // The row says what the package is at a glance…
    expect(screen.getByText('Starter')).toBeTruthy();
    expect(screen.getByText(formatMoney(29900, 'ETB'))).toBeTruthy();
    expect(screen.getByText('6 days')).toBeTruthy();
    expect(screen.getByText('2 revisions')).toBeTruthy();
    expect(screen.getByText('2 features')).toBeTruthy();

    // …and keeps the form behind a disclosure.
    expect(screen.queryByLabelText('Package name')).toBeNull();
    expect(
      screen
        .getByRole('button', {name: /Edit package Starter/})
        .getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('reveals the form when the package row is opened', async () => {
    renderField([pkg({name: 'Starter'})]);

    await userEvent.click(
      screen.getByRole('button', {name: /Edit package Starter/}),
    );

    expect(screen.getByLabelText(/Package name/)).toHaveProperty(
      'value',
      'Starter',
    );
    expect(
      screen
        .getByRole('button', {name: /Edit package Starter/})
        .getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('lets the arrow itself open the package', async () => {
    renderField([pkg({name: 'Starter'})]);

    const trigger = screen.getByRole('button', {
      name: /Edit package Starter/,
    });

    // The arrow is where people click to open a disclosure, so it has to be
    // part of the trigger's hit area rather than a decorative sibling.
    const chevron = trigger.querySelector('svg');
    expect(chevron).toBeTruthy();

    await userEvent.click(chevron as Element);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps one package open at a time', async () => {
    renderField([pkg({name: 'Starter'}), pkg({name: 'Premium'})]);

    await userEvent.click(
      screen.getByRole('button', {name: /Edit package Starter/}),
    );
    await userEvent.click(
      screen.getByRole('button', {name: /Edit package Premium/}),
    );

    expect(
      screen
        .getByRole('button', {name: /Edit package Starter/})
        .getAttribute('aria-expanded'),
    ).toBe('false');
    expect(
      screen
        .getByRole('button', {name: /Edit package Premium/})
        .getAttribute('aria-expanded'),
    ).toBe('true');
    expect(screen.getAllByLabelText(/Package name/)).toHaveLength(1);
  });

  it('opens a newly added package so the creator can type straight away', async () => {
    renderField([pkg({name: 'Starter'})]);

    await userEvent.click(screen.getByRole('button', {name: 'Add package'}));

    expect(screen.getAllByLabelText(/Package name/)).toHaveLength(1);
    expect(screen.getByLabelText(/Package name/)).toHaveProperty('value', '');
  });

  it('opens the package that owns a validation error', () => {
    renderField([pkg({name: 'Starter'}), pkg({name: 'Premium'})], {
      'packages.1.name': 'A package name is required.',
    });

    // An error inside a collapsed row would be invisible otherwise.
    expect(
      screen
        .getByRole('button', {name: /Edit package Premium/})
        .getAttribute('aria-expanded'),
    ).toBe('true');
    expect(screen.getByLabelText(/Package name/)).toHaveProperty(
      'value',
      'Premium',
    );
    expect(screen.getByText('A package name is required.')).toBeTruthy();
  });

  it('says quote-only instead of showing an empty price', () => {
    renderField([pkg({name: 'Custom', price: ''})]);

    expect(screen.getByText('Quote only')).toBeTruthy();
  });

  it('removes the package it was asked to remove', async () => {
    const {changes} = renderField([
      pkg({name: 'Starter'}),
      pkg({name: 'Premium'}),
    ]);

    await userEvent.click(
      screen.getByRole('button', {name: 'Remove package Premium'}),
    );

    expect(changes[0]).toEqual([pkg({name: 'Starter'})]);
  });

  it('stops adding packages at the API maximum', async () => {
    renderField(Array.from({length: 6}, (_, index) => pkg({name: `Package ${index + 1}`})));

    const addButton = screen.getByRole('button', {name: 'Add package'});
    expect(addButton).toHaveProperty('disabled', true);
    expect(screen.getByText('Maximum 6 packages reached.')).toBeTruthy();
  });

  it('drops the paragraph that used to explain the whole section', () => {
    renderField([pkg({name: 'Starter'})]);

    expect(
      screen.queryByText(/Only packages with a name are published/),
    ).toBeNull();
  });
});