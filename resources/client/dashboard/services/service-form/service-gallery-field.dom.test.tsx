/** @vitest-environment jsdom */
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';

// CroppedCover keeps its own control and exposes the field label through an
// sr-only element, so the mock stays invisible and owns no visible text.
vi.mock('@common/uploads/components/cropped-image-selector', () => ({
  CroppedCover: ({label}: {label?: string}) => (
    <div data-testid="cropped-cover" aria-label={label} />
  ),
}));

const {ServiceGalleryField, SERVICE_GALLERY_MAX} = await import(
  './service-gallery-field'
);

const image = (id: number) => ({
  id,
  file_entry_id: id,
  url: `https://cdn.test/image-${id}.jpg`,
});

function galleryOf(count: number) {
  return Array.from({length: count}, (_, index) => image(index + 1));
}

describe('service gallery field', () => {
  it('labels the cover and the gallery apart from one another', () => {
    render(
      <ServiceGalleryField
        coverUrl=""
        gallery={[]}
        onCoverChange={vi.fn()}
        onGalleryChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Cover image')).toBeTruthy();
    expect(screen.getByText('Gallery images')).toBeTruthy();
    // The two controls used to be anonymous drop zones side by side.
    expect(
      screen.queryByText('Select file to upload or drag-and-drop file'),
    ).toBeNull();
    expect(
      screen.queryByText('Drag & drop files or click to browse'),
    ).toBeNull();
  });

  it('shows how many images are used against the limit', () => {
    render(
      <ServiceGalleryField
        coverUrl=""
        gallery={galleryOf(3)}
        onCoverChange={vi.fn()}
        onGalleryChange={vi.fn()}
      />,
    );

    expect(screen.getByText(`3 of ${SERVICE_GALLERY_MAX}`)).toBeTruthy();
  });

  it('removes an image without touching the others', async () => {
    const onGalleryChange = vi.fn();

    render(
      <ServiceGalleryField
        coverUrl=""
        gallery={galleryOf(3)}
        onCoverChange={vi.fn()}
        onGalleryChange={onGalleryChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', {name: 'Remove image 2'}));

    expect(onGalleryChange).toHaveBeenCalledWith([image(1), image(3)]);
  });

  it('refuses more than the gallery limit', () => {
    render(
      <ServiceGalleryField
        coverUrl=""
        gallery={galleryOf(SERVICE_GALLERY_MAX)}
        onCoverChange={vi.fn()}
        onGalleryChange={vi.fn()}
      />,
    );

    // At the limit the add affordance disappears rather than silently
    // dropping a ninth upload after the creator picked it.
    expect(screen.queryByRole('button', {name: 'Add images'})).toBeNull();
    expect(
      screen.getByText(`Gallery is full (${SERVICE_GALLERY_MAX} of ${SERVICE_GALLERY_MAX})`),
    ).toBeTruthy();
  });

  it('offers the add affordance while there is room', () => {
    render(
      <ServiceGalleryField
        coverUrl=""
        gallery={galleryOf(2)}
        onCoverChange={vi.fn()}
        onGalleryChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', {name: 'Add images'})).toBeTruthy();
  });
});