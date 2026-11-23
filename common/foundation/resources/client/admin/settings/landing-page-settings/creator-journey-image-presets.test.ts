import {getMissingCreatorJourneyImages} from '@common/admin/settings/landing-page-settings/creator-journey-image-presets';
import {describe, expect, it} from 'vitest';

describe('creator journey illustration defaults', () => {
  it('offers one local artwork placeholder per existing journey step', () => {
    const results = getMissingCreatorJourneyImages([{}, {}, {}]);

    expect(results.map(result => result.index)).toEqual([0, 1, 2]);
    expect(results.map(result => result.image.src)).toEqual([
      'images/landing/creator-storefront.svg',
      'images/landing/creator-hero.svg',
      'images/landing/creator-checkout.svg',
    ]);
  });

  it('never replaces previously selected step artwork', () => {
    const results = getMissingCreatorJourneyImages([
      {image: {src: '/uploads/my-creator-photo.webp'}},
      {},
      {image: {src: '/uploads/my-checkout.webp'}},
    ]);

    expect(results).toEqual([
      {
        index: 1,
        image: {src: 'images/landing/creator-hero.svg', width: 1280, height: 880},
      },
    ]);
  });

  it('does not create new steps or affect additional feature cards', () => {
    expect(getMissingCreatorJourneyImages([])).toEqual([]);
    expect(getMissingCreatorJourneyImages([{}, {}, {}, {}])).toHaveLength(3);
  });
});
