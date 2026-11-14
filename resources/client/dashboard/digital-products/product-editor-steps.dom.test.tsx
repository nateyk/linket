/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {DigitalProductEditor} from './digital-product-editor';
import {EbookEditor} from './ebook-editor';
import {AudioEditor} from './audio-editor';

const fields = {
  details: <input aria-label="Product name" defaultValue="Draft title" />,
  files: <button>Upload buyer file</button>,
  sample: <button>Upload optional sample</button>,
  pricing: <input aria-label="Product price" defaultValue="40" />,
  storefront: <button>Choose Storefront</button>,
};

test.each([
  ['digital', DigitalProductEditor, 'Product details', 'Files buyers receive', 'Sample PDF (optional)'],
  ['ebook', EbookEditor, 'Book information', 'Book files', 'Sample pages (optional)'],
  ['audio', AudioEditor, 'Audio information', 'Full audio files', 'Preview clips (optional)'],
] as const)('%s shows only one stage while keeping form state mounted', (_type, Editor, details, files, sample) => {
  const view = render(<Editor {...fields} activeStep="details" />);
  const name = screen.getByRole('textbox', {name: 'Product name'}) as HTMLInputElement;
  fireEvent.change(name, {target: {value: 'My edited product'}});
  expect(screen.getByRole('region', {name: details})).toBeTruthy();
  expect(screen.queryByRole('region', {name: files})).toBeNull();
  expect(screen.queryByRole('region', {name: sample})).toBeNull();
  expect(screen.queryByRole('textbox', {name: 'Product price'})).toBeNull();
  expect(view.container.querySelectorAll('[data-slot="product-editor-section"]')).toHaveLength(5);

  view.rerender(<Editor {...fields} activeStep="files" />);
  expect(screen.queryByRole('region', {name: details})).toBeNull();
  expect(screen.getByRole('region', {name: files})).toBeTruthy();
  expect(screen.getByRole('region', {name: sample})).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Upload optional sample'})).toBeTruthy();
  expect(screen.queryByRole('textbox', {name: 'Product price'})).toBeNull();
  expect(name.isConnected).toBe(true);
  expect(name.value).toBe('My edited product');

  view.rerender(<Editor {...fields} activeStep="pricing" />);
  expect(screen.queryByRole('region', {name: files})).toBeNull();
  expect(screen.queryByRole('region', {name: sample})).toBeNull();
  expect(screen.getByRole('textbox', {name: 'Product price'})).toBeTruthy();

  view.rerender(<Editor {...fields} activeStep="details" />);
  expect(screen.getByRole('textbox', {name: 'Product name'})).toBe(name);
  expect(name.value).toBe('My edited product');
});

test('inactive steps are truly inert, including optional preview uploads', () => {
  const view = render(<EbookEditor {...fields} activeStep="details" />);
  const sample = view.container.querySelector('#ebook-public-sample')!.closest('section')!;
  expect(sample.hidden).toBe(true);
  expect(sample.hasAttribute('inert')).toBe(true);
  view.rerender(<EbookEditor {...fields} activeStep="files" />);
  expect(sample.hidden).toBe(false);
  expect(sample.hasAttribute('inert')).toBe(false);
});
