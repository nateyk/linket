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
  pricing: true,
  storefront: false,
};

test('four steps group optional samples with buyer files in one row and a vertical desktop rail', () => {
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
  expect(within(nav).getAllByRole('listitem')).toHaveLength(4);
  expect(nav.querySelector('ol')?.className).toContain('grid-cols-4');
  expect(nav.querySelector('ol')?.className).toContain('xl:grid-cols-1');
  expect(nav.querySelectorAll('[data-slot="separator"]')).toHaveLength(3);
  expect(nav.querySelector('li > span[aria-hidden="true"]')?.className).toContain('start-1/2 -end-1/2');
  expect(PRODUCT_AUTHORING_STEP_ORDER).toEqual(['details', 'files', 'pricing', 'storefront']);
  expect(within(nav).queryByText('Step 2 of 4')).toBeNull();
  expect(within(nav).queryByText('Product setup')).toBeNull();

  const selected = within(nav).getByRole('button', {name: 'Files & sample, step 2 of 4'});
  expect(selected.getAttribute('aria-current')).toBe('step');
  expect(selected.getAttribute('aria-controls')).toBe('ebook-private-files');
  expect(selected.getAttribute('data-step-complete')).toBe('true');
  expect(selected.getAttribute('aria-description')).toBe('Complete');
  // The current step retains the primary focus cue even when complete.
  expect(selected.querySelector('span[aria-hidden="true"]')?.className).toContain('bg-primary');
  expect(selected.className).toContain('bg-primary/5');
  const previous = within(nav).getByRole('button', {name: 'Details, step 1 of 4'});
  expect(previous.querySelector('span[aria-hidden="true"]')?.className).toContain('bg-positive');
  expect(previous.getAttribute('data-step-state')).toBe('previous');
  expect(within(nav).getAllByText('Upload buyer files and an optional public sample.')).toHaveLength(1);
  expect(nav.querySelector('[data-slot="creator-step-description"]')?.className).toContain('xl:block');
  expect(within(nav).getByRole('button', {name: 'Price, step 3 of 4'}).getAttribute('data-step-complete')).toBe('false');
});

test('keyboard activation chooses a destination without removing another section', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<ProductAuthoringSteps type="audio" active="details" completed={completed} onSelect={onSelect} />);
  const target = screen.getByRole('button', {name: 'Storefront, step 4 of 4'});
  target.focus();
  await user.keyboard('{Enter}');
  expect(onSelect).toHaveBeenCalledWith('storefront');
  expect(target.getAttribute('aria-controls')).toBe('audio-storefront');
});

test('server validation selects Files for a private file or optional sample, and Price for billing', async () => {
  const {productAuthoringStepForErrors} = await import('./product-authoring-steps');
  expect(productAuthoringStepForErrors({file_ids: 'Please upload a file'})).toBe('files');
  expect(productAuthoringStepForErrors({sample_file_ids: 'Invalid preview'})).toBe('files');
  expect(productAuthoringStepForErrors({price_cents: 'Invalid price'})).toBe('pricing');
  expect(productAuthoringStepForErrors({title: 'Required'})).toBe('details');
});

test.each([
  ['digital', 'digital-product-storefront'],
  ['ebook', 'ebook-storefront'],
  ['audio', 'audio-storefront'],
] as const)('navigating %s focuses its existing Storefront heading', (type, id) => {
  const editor = document.createElement('div');
  editor.setAttribute('data-slot', 'section-content');
  editor.scrollTop = 75;
  editor.scrollTo = vi.fn();
  editor.getBoundingClientRect = vi.fn(() => ({top: 100} as DOMRect));
  const heading = document.createElement('h2');
  heading.id = id;
  heading.tabIndex = -1;
  heading.scrollIntoView = vi.fn();
  heading.getBoundingClientRect = vi.fn(() => ({top: 260} as DOMRect));
  editor.appendChild(heading);
  document.body.appendChild(editor);

  focusProductAuthoringStep(type as NonCourseProductType, 'storefront');

  expect(editor.scrollTo).toHaveBeenCalledWith({top: 219, behavior: 'auto'});
  expect(heading.scrollIntoView).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(heading);
  editor.remove();
});
