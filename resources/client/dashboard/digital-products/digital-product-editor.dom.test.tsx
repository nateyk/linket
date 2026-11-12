/**
 * @vitest-environment jsdom
 */
import {render, screen, within} from '@testing-library/react';
import {describe, expect, test} from 'vitest';
import {DigitalProductEditor} from './digital-product-editor';

const contents = {
  details: <button>Change product title</button>,
  files: <button>Upload private download</button>,
  sample: <button>Upload optional sample PDF</button>,
  pricing: <button>Choose ETB price</button>,
  storefront: <button>Choose optional Storefront</button>,
};

describe('dedicated Digital Product editor', () => {
  test('presents a task-first five-section layout without another type wizard', () => {
    render(<DigitalProductEditor {...contents} />);
    expect(screen.getAllByRole('heading', {level: 2}).map(h => h.textContent)).toEqual([
      'Product details',
      'Files buyers receive',
      'Sample PDF (optional)',
      'Price',
      'Storefront placement (optional)',
    ]);
    expect(screen.queryByText('What are you selling?')).toBeNull();
    expect(screen.queryByText('Step 1 of 2')).toBeNull();
  });

  test('keeps the paid download and public sample in different explicitly labeled sections', () => {
    render(<DigitalProductEditor {...contents} />);
    const privateSection = screen.getByRole('region', {name: 'Files buyers receive'});
    const sampleSection = screen.getByRole('region', {name: 'Sample PDF (optional)'});
    expect(within(privateSection).getByRole('button', {name: 'Upload private download'})).not.toBeNull();
    expect(within(sampleSection).getByRole('button', {name: 'Upload optional sample PDF'})).not.toBeNull();
    expect(within(privateSection).queryByRole('button', {name: 'Upload optional sample PDF'})).toBeNull();
  });

  test('all editor tasks are reachable without expanding a generic accordion', () => {
    const {container} = render(<DigitalProductEditor {...contents} />);
    expect(container.querySelector('[data-slot="accordion"]')).toBeNull();
    expect(container.querySelectorAll('[data-slot="product-editor-section"]')).toHaveLength(5);
    expect(screen.getByRole('button', {name: 'Choose ETB price'})).not.toBeNull();
    expect(screen.getByRole('button', {name: 'Choose optional Storefront'})).not.toBeNull();
  });

  test('section headings are accessible without duplicate help-icon chrome', () => {
    render(<DigitalProductEditor {...contents} />);
    const files = screen.getByRole('region', {name: 'Files buyers receive'});
    const sample = screen.getByRole('region', {name: 'Sample PDF (optional)'});
    expect(within(files).getByRole('heading', {name: 'Files buyers receive'})).not.toBeNull();
    expect(within(sample).getByRole('button', {name: 'Upload optional sample PDF'})).not.toBeNull();
    expect(screen.queryByRole('button', {name: 'About this section'})).toBeNull();
  });
});
