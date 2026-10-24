/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import {describe, expect, test} from 'vitest';
import {
  ProductSampleFields,
  sampleSectionKind,
} from './product-sample-fields';

describe('sample section by product type', () => {
  test('shows audio previews for audio, a pdf sample for ebooks and digital, and nothing for courses', () => {
    expect(sampleSectionKind('audio')).toBe('audio');
    expect(sampleSectionKind('ebook')).toBe('pdf');
    expect(sampleSectionKind('digital')).toBe('pdf');
    expect(sampleSectionKind('course')).toBeNull();
  });

  test('audio fields explain that full tracks stay private', () => {
    render(
      <ProductSampleFields kind="audio" samples={[]} onChange={() => {}} />,
    );

    expect(
      screen.getByText(
        'Short clips buyers can play before purchase. Full tracks stay private.',
      ),
    ).toBeTruthy();
  });

  test('pdf fields explain that the full ebook stays private', () => {
    render(
      <ProductSampleFields kind="pdf" samples={[]} onChange={() => {}} />,
    );

    expect(
      screen.getByText(
        'Upload a short PDF of sample pages. Buyers see this on the product page; your full ebook stays private.',
      ),
    ).toBeTruthy();
  });
});
