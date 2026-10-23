import {describe, expect, test} from 'vitest';
import {
  demoPackOrder,
  findPackOrder,
  isStreamableAudioName,
  remainingDownloads,
  type PackDetailOrder,
} from './portal-pack-order';

describe('portal pack order helpers', () => {
  test('detects streamable audio filenames', () => {
    expect(isStreamableAudioName('beat.mp3')).toBe(true);
    expect(isStreamableAudioName('loop.WAV')).toBe(true);
    expect(isStreamableAudioName('kit.zip')).toBe(false);
    expect(isStreamableAudioName(null)).toBe(false);
  });

  test('finds download vs audio orders and demo fallbacks', () => {
    const orders: PackDetailOrder[] = [
      {
        id: 'a1',
        product_title: 'Pack',
        product_type: 'digital',
        paid_at: null,
        downloads: [],
      },
      {
        id: 'a2',
        product_title: 'Beats',
        product_type: 'audio',
        paid_at: null,
        downloads: [],
      },
      {
        id: 'a3',
        product_title: 'Course',
        product_type: 'course',
        course_id: 9,
        paid_at: null,
        downloads: [],
      },
    ];

    expect(findPackOrder(orders, 'a1', 'download')?.product_title).toBe('Pack');
    expect(findPackOrder(orders, 'a2', 'download')).toBeUndefined();
    expect(findPackOrder(orders, 'a2', 'audio')?.product_title).toBe('Beats');
    expect(findPackOrder(orders, 'a3', 'download')).toBeUndefined();
    expect(demoPackOrder('demo-order-pack', 'download')?.is_demo).toBe(true);
    expect(demoPackOrder('demo-order-audio', 'audio')?.is_demo).toBe(true);
  });

  test('sums remaining downloads', () => {
    expect(
      remainingDownloads({
        id: 'x',
        product_title: null,
        paid_at: null,
        downloads: [
          {
            id: 1,
            name: 'a',
            remaining_downloads: 3,
            expires_at: null,
            available: true,
          },
          {
            id: 2,
            name: 'b',
            remaining_downloads: 2,
            expires_at: null,
            available: false,
          },
        ],
      }),
    ).toBe(3);
  });
});
