/** @vitest-environment jsdom */
import {render, screen, within} from '@testing-library/react';
import {describe, expect, test} from 'vitest';
import {AudioEditor} from './audio-editor';

const slots = {
  details: <button>Change audio information</button>,
  files: <button>Upload purchased audio</button>,
  sample: <button>Manage public preview clips</button>,
  pricing: <button>Set audio price</button>,
  storefront: <button>Choose storefront</button>,
};

describe('dedicated Audio editor', () => {
  test('shows full purchased audio before public preview clips', () => {
    render(<AudioEditor {...slots} />);
    expect(screen.getAllByRole('heading', {level: 2}).map(h => h.textContent)).toEqual([
      'Audio information',
      'Full audio files',
      'Preview clips (optional)',
      'Price',
      'Storefront placement (optional)',
    ]);
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  test('keeps private full audio separate from public clips', () => {
    render(<AudioEditor {...slots} />);
    const files = screen.getByRole('region', {name: 'Full audio files'});
    const samples = screen.getByRole('region', {name: 'Preview clips (optional)'});
    expect(within(files).getByRole('button', {name: 'Upload purchased audio'})).not.toBeNull();
    expect(within(files).getByText(/private until a purchase is verified/)).not.toBeNull();
    expect(within(files).queryByText(/before purchase/)).toBeNull();
    expect(within(samples).getByRole('button', {name: 'Manage public preview clips'})).not.toBeNull();
    expect(within(samples).getByText(/before purchase/)).not.toBeNull();
  });

  test('states the existing eight-clip limit without promising full-track streaming', () => {
    const {container} = render(<AudioEditor {...slots} />);
    expect(screen.getByText(/up to 8 short preview clips/i)).not.toBeNull();
    expect(container.textContent).not.toMatch(/stream full tracks/i);
  });
});
