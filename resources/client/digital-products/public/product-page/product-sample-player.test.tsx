/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useEffect, type ReactNode} from 'react';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import type {PublicDigitalProduct, PublicProductSample} from '../digital-product-public-pages';
import {ProductSamplePdf} from './product-sample-pdf';
import {
  ProductSamplePlayer,
  ProductSampleStage,
  ProductSampleTracklist,
} from './product-sample-player';

vi.mock('react-pdf', () => ({
  pdfjs: {
    version: '6.5.438',
    GlobalWorkerOptions: {workerSrc: ''},
  },
  Document: ({
    file,
    children,
    onLoadSuccess,
  }: {
    file: string;
    children: ReactNode;
    onLoadSuccess?: (doc: {numPages: number}) => void;
  }) => {
    useEffect(() => {
      onLoadSuccess?.({numPages: 3});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file]);

    return (
      <div data-testid="mock-pdf-document" data-file={file}>
        {children}
      </div>
    );
  },
  Page: ({pageNumber, width}: {pageNumber: number; width: number}) => (
    <div
      data-testid="mock-pdf-page"
      data-page={pageNumber}
      data-width={width}
    >
      Page {pageNumber}
    </div>
  ),
}));

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
        <ProductSampleStage
          product={product}
          appearance={{
            btnConfig: {
              variant: 'solid',
              radius: 'rounded-lg',
              shadow: 'hard',
              color: '#111111',
              textColor: '#ffffff',
            },
          }}
        />
        <ProductSampleTracklist />
      </ProductSamplePlayer>,
    );

    expect(screen.getAllByText('Free preview').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Midnight Signals').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rooftop Rain').length).toBeGreaterThan(0);
    expect(screen.getByText('Full pack unlocked after purchase')).toBeTruthy();
    expect(screen.getByRole('slider', {name: 'Preview progress'})).toBeTruthy();
    expect(screen.getByText('1/2')).toBeTruthy();
    expect(document.querySelector('[data-slot="visualizer"]')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Next preview'}).className).toContain(
      'rounded-button',
    );
    const playButtons = screen.getAllByRole('button', {name: 'Play preview'});
    expect(playButtons).toHaveLength(1);
    expect(playButtons[0].style.getPropertyValue('--biolink-button-background')).toBe(
      '#111111',
    );
    expect(playButtons[0].style.boxShadow).toBeTruthy();
    const waveformBars = screen
      .getByTestId('preview-waveform')
      .querySelectorAll('span');
    expect(waveformBars[0]?.style.borderRadius).toBe('3px');
    expect(screen.queryByText('SECRET-PAID-album.zip')).toBeNull();
  });

  test('stops after the last preview instead of looping to the first', () => {
    render(
      <ProductSamplePlayer samples={samples}>
        <ProductSampleStage product={product} />
        <ProductSampleTracklist appearance={{btnConfig: {radius: 'rounded-lg'}}} />
      </ProductSamplePlayer>,
    );

    fireEvent.ended(document.querySelector('audio')!);
    expect(screen.getByText('Rooftop Rain', {selector: 'p'})).toBeTruthy();

    fireEvent.ended(document.querySelector('audio')!);
    expect(screen.getByText('Rooftop Rain', {selector: 'p'})).toBeTruthy();
  });

  test('selects and activates clicked tracks from the standalone tracklist card', () => {
    render(
      <ProductSamplePlayer samples={samples}>
        <ProductSampleStage product={product} />
        <ProductSampleTracklist appearance={{btnConfig: {radius: 'rounded-lg'}}} />
      </ProductSamplePlayer>,
    );

    const trackButtons = screen.getAllByRole('button', {name: /Free preview/});
    expect(trackButtons[0].getAttribute('aria-current')).toBe('true');

    fireEvent.click(trackButtons[1]);
    expect(trackButtons[1].getAttribute('aria-current')).toBe('true');
    expect(screen.getByText('2/2')).toBeTruthy();
  });
});

describe('pdf sample viewer', () => {
  beforeEach(() => {
    globalThis.ResizeObserver = class ResizeObserver {
      private callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe(target: Element) {
        this.callback(
          [
            {
              target,
              contentRect: {width: 480, height: 600} as DOMRectReadOnly,
            } as ResizeObserverEntry,
          ],
          this,
        );
      }
      unobserve() {}
      disconnect() {}
    };
  });

  test('renders pdf viewer controls, theme heading, and sample actions', async () => {
    render(
      <ProductSamplePdf
        appearance={{
          btnConfig: {radius: 'rounded-lg', variant: 'solid'},
        }}
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

    expect(screen.getByText('Sample pages')).toBeTruthy();
    expect(screen.getByText('Chapter 1')).toBeTruthy();
    expect(
      screen.getByRole('link', {name: /Open sample/}).getAttribute('href'),
    ).toBe('https://example.test/sample.pdf');
    expect(
      screen.getByRole('link', {name: 'Download'}).getAttribute('href'),
    ).toBe('https://example.test/sample.pdf');

    await waitFor(() => {
      expect(screen.getByTestId('mock-pdf-document').getAttribute('data-file')).toBe(
        'https://example.test/sample.pdf',
      );
      expect(screen.getByText('of 3')).toBeTruthy();
    });

    expect(screen.getByTestId('mock-pdf-page').getAttribute('data-page')).toBe('1');

    fireEvent.click(screen.getByRole('button', {name: 'Next page'}));
    expect(screen.getByTestId('mock-pdf-page').getAttribute('data-page')).toBe('2');

    fireEvent.click(screen.getByRole('button', {name: 'Zoom in'}));
    expect(screen.getByText('125%')).toBeTruthy();
    expect(screen.getByTestId('mock-pdf-page').getAttribute('data-width')).toBe('600');

    fireEvent.click(screen.getByRole('button', {name: 'Fit to width'}));
    expect(screen.getByText('100%')).toBeTruthy();
  });
});
