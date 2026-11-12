/** @vitest-environment jsdom */
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vitest';
import {
  focusProductAuthoringStep,
  PRODUCT_AUTHORING_STEP_ORDER,
  ProductAuthoringSteps,
  type NonCourseProductType,
  type ProductAuthoringStep,
} from './product-authoring-steps';

const completed: Record<ProductAuthoringStep, boolean> = {
  details: true,
  files: true,
  sample: false,
  pricing: true,
  storefront: false,
};

test('all five steps form one mobile row and a vertical desktop rail', () => {
  const onSelect = vi.fn();
  render(
    <ProductAuthoringSteps
      type="ebook"
      active="files"
      completed={completed}
      onSelect={onSelect}
    />,
  );
  const nav = screen.getByRole('navigation', {name: 'Product creation steps'});
  expect(within(nav).getAllByRole('listitem')).toHaveLength(5);
  expect(nav.querySelector('ol')?.className).toContain('grid-cols-5');
  expect(nav.querySelector('ol')?.className).toContain('xl:grid-cols-1');
  expect(nav.querySelectorAll('[data-slot="separator"]')).toHaveLength(4);
  expect(nav.querySelector('li > span[aria-hidden="true"]')?.className).toContain('start-1/2 -end-1/2');
  expect(PRODUCT_AUTHORING_STEP_ORDER).toEqual(['details', 'files', 'sample', 'pricing', 'storefront']);

  const selected = within(nav).getByRole('button', {name: 'Files, step 2 of 5'});
  expect(selected.getAttribute('aria-current')).toBe('step');
  expect(selected.getAttribute('aria-controls')).toBe('ebook-private-files');
  expect(selected.getAttribute('data-step-complete')).toBe('true');
  expect(selected.querySelector('span[aria-hidden="true"]')?.className).toContain('bg-positive');
  expect(within(nav).getByRole('button', {name: 'Sample, step 3 of 5'}).getAttribute('data-step-complete')).toBe('false');
});

test('keyboard activation chooses a destination without removing another section', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<ProductAuthoringSteps type="audio" active="details" completed={completed} onSelect={onSelect} />);
  const target = screen.getByRole('button', {name: 'Storefront, step 5 of 5'});
  target.focus();
  await user.keyboard('{Enter}');
  expect(onSelect).toHaveBeenCalledWith('storefront');
  expect(target.getAttribute('aria-controls')).toBe('audio-storefront');
});

test.each([
  ['digital', 'digital-product-storefront'],
  ['ebook', 'ebook-storefront'],
  ['audio', 'audio-storefront'],
] as const)('navigating %s focuses its existing Storefront heading', (type, id) => {
  const heading = document.createElement('h2');
  heading.id = id;
  heading.tabIndex = -1;
  heading.scrollIntoView = vi.fn();
  document.body.appendChild(heading);
  focusProductAuthoringStep(type as NonCourseProductType, 'storefront');
  expect(heading.scrollIntoView).toHaveBeenCalledWith({block: 'start', behavior: 'auto'});
  expect(document.activeElement).toBe(heading);
  heading.remove();
});
