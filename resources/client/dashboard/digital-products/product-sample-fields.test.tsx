/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import type {ProductSampleDraft} from './product-creation-context';
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
        'Full tracks stay private; previews are public.',
      ),
    ).toBeTruthy();
  });

  test('Digital product PDF samples explicitly keep paid downloads private', () => {
    render(
      <ProductSampleFields
        kind="pdf"
        productType="digital"
        samples={[]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(
      'Full product files stay private; the sample is public.',
    )).toBeTruthy();
  });

  test('pdf fields explain that the full ebook stays private', () => {
    render(
      <ProductSampleFields kind="pdf" samples={[]} onChange={() => {}} />,
    );

    expect(
      screen.getByText(
        'Full ebook stays private; sample pages are public.',
      ),
    ).toBeTruthy();
  });
});

function AudioSampleHarness({
  initial,
  error,
}: {
  initial: ProductSampleDraft[];
  error?: string;
}) {
  const [samples, setSamples] = useState(initial);
  return <ProductSampleFields kind="audio" samples={samples} onChange={setSamples} error={error} />;
}

const audioSamples: ProductSampleDraft[] = Array.from({length: 8}, (_, index) => ({
  fileEntryId: index + 1,
  name: `clip-${index + 1}.mp3`,
  title: `Clip ${index + 1}`,
  durationMs: null,
}));

describe('audio preview editing regression', () => {
  test('enforces the existing eight-preview cap without discarding earlier clips', () => {
    render(<AudioSampleHarness initial={audioSamples} />);
    expect(screen.getAllByRole('textbox', {name: 'Preview title'})).toHaveLength(8);
    expect(screen.getByText('You can add up to 8 preview tracks.')).not.toBeNull();
  });

  test('updates preview titles and moves clips without losing another title', async () => {
    const user = userEvent.setup();
    render(<AudioSampleHarness initial={audioSamples.slice(0, 2)} />);
    const titles = screen.getAllByRole('textbox', {name: 'Preview title'}) as HTMLInputElement[];
    await user.clear(titles[0]);
    await user.type(titles[0], 'Intro sample');
    await user.click(screen.getAllByRole('button', {name: 'Move preview down'})[0]);
    const reordered = screen.getAllByRole('textbox', {name: 'Preview title'}) as HTMLInputElement[];
    expect(reordered.map(input => input.value)).toEqual(['Clip 2', 'Intro sample']);
  });

  test('shows a sample validation error without clearing the selected clips', () => {
    render(<AudioSampleHarness initial={audioSamples.slice(0, 2)} error="Unsupported preview file" />);
    expect(screen.getByText('Unsupported preview file')).not.toBeNull();
    const titles = screen.getAllByRole('textbox', {name: 'Preview title'}) as HTMLInputElement[];
    expect(titles.map(input => input.value)).toEqual(['Clip 1', 'Clip 2']);
  });
});
