/** @vitest-environment jsdom */
import {render, screen, within} from '@testing-library/react';
import {describe, expect, test} from 'vitest';
import {EbookEditor} from './ebook-editor';

const slots = {
  details: <button>Change book information</button>,
  files: <button>Upload PDF or EPUB</button>,
  sample: <button>Add optional PDF sample</button>,
  pricing: <button>Set book price</button>,
  storefront: <button>Choose storefront</button>,
};

describe('dedicated E-book editor', () => {
  test('uses a book-first five-section layout, not a generic wizard or digital-file tabs', () => {
    render(<EbookEditor {...slots} />);
    expect(screen.getAllByRole('heading', {level: 2}).map(h => h.textContent)).toEqual([
      'Book information',
      'Book files',
      'Sample pages (optional)',
      'Price',
      'Storefront placement (optional)',
    ]);
    expect(screen.queryByText('What are you selling?')).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  test('supports PDF or EPUB without requiring both formats', () => {
    render(<EbookEditor {...slots} />);
    const bookFiles = screen.getByRole('region', {name: 'Book files'});
    expect(within(bookFiles).getByText(/^Upload a PDF or EPUB book file\./)).not.toBeNull();
    expect(within(bookFiles).getByRole('button', {name: 'Upload PDF or EPUB'})).not.toBeNull();
    expect(within(bookFiles).queryByText(/both files required/i)).toBeNull();
  });

  test('keeps optional public sample separate from private book files', () => {
    render(<EbookEditor {...slots} />);
    const books = screen.getByRole('region', {name: 'Book files'});
    const sample = screen.getByRole('region', {name: 'Sample pages (optional)'});
    expect(within(books).queryByText('Add optional PDF sample')).toBeNull();
    expect(within(sample).getByRole('button', {name: 'Add optional PDF sample'})).not.toBeNull();
    expect(within(sample).getByText(/before purchase/)).not.toBeNull();
  });
});
