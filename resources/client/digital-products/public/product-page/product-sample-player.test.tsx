/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import type {PublicDigitalProduct, PublicProductSample} from '../digital-product-public-pages';
import {ProductSamplePdf} from './product-sample-pdf';
import {
  ProductSamplePlayer,
  ProductSampleStage,
  ProductSampleTracklist,
} from './product-sample-player';

const samples: PublicProductSample[] = [
  {
    id: 1,
    title: 'Midnight Signals',
    kind: 'audio',
    position: 0,
    duration_ms: 184000,
    url: 'https://example.test/preview-1',
  },
  {
    id: 2,
    title: 'Rooftop Rain',
    kind: 'audio',
    position: 1,
    duration_ms: 152000,
    url: 'https://example.test/preview-2',
  },
];

const product = {
  id: 9,
  title: 'Midnight Signals — Lo-Fi Beat Pack',
  price_cents: 2900,
  currency: 'ETB',
  type: 'audio',
  cover: {url: 'https://example.test/cover.webp'},
} satisfies PublicDigitalProduct;

describe('audio sample player', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() =>
      Promise.resolve(),
    );
  });
  test('shows only preview tracks, a free badge, and the locked-pack line', () => {
    render(
      <ProductSamplePlayer samples={samples}>
        <ProductSampleStage product={product} />
        <ProductSampleTracklist />
      </ProductSamplePlayer>,
    );

    expect(screen.getAllByText('Free preview').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Midnight Signals').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rooftop Rain').length).toBeGreaterThan(0);
    expect(screen.getByText('Full pack unlocked after purchase')).toBeTruthy();
    expect(screen.getByRole('slider', {name: 'Preview progress'})).toBeTruthy();
    expect(screen.getByText('1/2')).toBeTruthy();
    expect(screen.queryByText('SECRET-PAID-album.zip')).toBeNull();
  });

  test('stops after the last preview instead of looping to the first', () => {
    render(
      <ProductSamplePlayer samples={samples}>
        <ProductSampleStage product={product} />
        <ProductSampleTracklist />
      </ProductSamplePlayer>,
    );

    fireEvent.ended(document.querySelector('audio')!);
    expect(screen.getByText('Rooftop Rain', {selector: 'p'})).toBeTruthy();

    fireEvent.ended(document.querySelector('audio')!);
    expect(screen.getByText('Rooftop Rain', {selector: 'p'})).toBeTruthy();
  });
});

describe('pdf sample viewer', () => {
  test('embeds the sample url and offers it in a new tab', () => {
    render(
      <ProductSamplePdf
        sample={{
          id: 4,
          title: 'Chapter 1',
          kind: 'pdf',
          position: 0,
          duration_ms: null,
          url: 'https://example.test/sample.pdf',
        }}
      />,
    );

    expect(screen.getByTitle('Sample PDF').getAttribute('src')).toBe(
      'https://example.test/sample.pdf',
    );
    expect(screen.getByRole('link', {name: /Open sample/}).getAttribute('href')).toBe(
      'https://example.test/sample.pdf',
    );
  });
});
