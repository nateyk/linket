/**
 * @vitest-environment jsdom
 */
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render} from '@testing-library/react';
import {expect, test} from 'vitest';
import {CroppedImageSelector} from './cropped-image-selector';

function renderSelector(value: string | null, showHint = true) {
  const client = new QueryClient({
    defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
  });
  return render(
    <QueryClientProvider client={client}>
      <FileUploadProvider>
        <CroppedImageSelector
          value={value}
          onChange={() => {}}
          uploadType="linkImages"
          label="Cover image"
          showHint={showHint}
        />
      </FileUploadProvider>
    </QueryClientProvider>,
  );
}

test('sr-only file input carries the field label as its accessible name (A-04)', () => {
  const {container} = renderSelector('https://example.com/cover.jpg');

  const input = container.querySelector('input[type="file"]');
  expect(input).toBeTruthy();
  expect(input!.getAttribute('aria-label')).toBe('Cover image');
});

test('image menu trigger is named after the image it acts on (A-03)', () => {
  const {container} = renderSelector('https://example.com/cover.jpg');

  const trigger = container.querySelector('[data-slot="dropdown-trigger"]');
  expect(trigger).toBeTruthy();
  expect(trigger!.getAttribute('aria-label')).toBe('Cover image');
});

test('file input stays labelled when there is no image yet (A-04)', () => {
  const {container} = renderSelector(null);

  const input = container.querySelector('input[type="file"]');
  expect(input).toBeTruthy();
  expect(input!.getAttribute('aria-label')).toBe('Cover image');
  expect(container.querySelector('[data-slot="dropdown-trigger"]')).toBeNull();
});


test('showHint=false removes the inline upload requirements text', () => {
  const {container} = renderSelector(null, false);

  expect(container.textContent).not.toContain('JPG, PNG, or WebP');
});
