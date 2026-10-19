/** @vitest-environment jsdom */
import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {ServiceGallery} from './service-gallery';

const gallery = [
  {id: 1, url: 'https://cdn.test/gallery-one.jpg'},
  {id: 2, url: 'https://cdn.test/gallery-two.jpg'},
];

describe('public service gallery', () => {
  it('shows the cover when the service has no gallery', () => {
    render(
      <ServiceGallery
        cover={{url: 'https://cdn.test/cover.jpg'}}
        images={[]}
        title="Logo design"
      />,
    );

    expect(screen.getByRole('img', {name: 'Logo design'})).toHaveProperty(
      'src',
      'https://cdn.test/cover.jpg',
    );
  });

  it('leads with the cover and keeps the gallery as thumbnails', () => {
    render(
      <ServiceGallery
        cover={{url: 'https://cdn.test/cover.jpg'}}
        images={gallery}
        title="Logo design"
      />,
    );

    expect(screen.getByRole('img', {name: 'Logo design'})).toHaveProperty(
      'src',
      'https://cdn.test/cover.jpg',
    );
    expect(screen.getByRole('button', {name: 'Logo design 1'})).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Logo design 2'})).toBeTruthy();
  });

  it('does not repeat the cover when it is also in the gallery', () => {
    render(
      <ServiceGallery
        cover={{url: 'https://cdn.test/gallery-one.jpg'}}
        images={gallery}
        title="Logo design"
      />,
    );

    // Cover plus two gallery images would render three thumbnails; the
    // duplicate must collapse so the visitor can still click through.
    expect(screen.getByRole('button', {name: 'Logo design 1'})).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Logo design 2'})).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Logo design 3'})).toBeNull();
  });

  it('still shows the placeholder when there is no cover and no gallery', () => {
    const {container} = render(
      <ServiceGallery images={[]} title="Logo design" />,
    );

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('shows the gallery alone when no cover is set', () => {
    render(<ServiceGallery images={gallery} title="Logo design" />);

    expect(screen.getByRole('img', {name: 'Logo design'})).toHaveProperty(
      'src',
      'https://cdn.test/gallery-one.jpg',
    );
  });
});