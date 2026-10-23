import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('my portal download and audio detail', () => {
  test('mounts pack detail routes and Open links under my-portal', () => {
    const router = fs.readFileSync(
      path.resolve('resources/client/app-router.tsx'),
      'utf8',
    );
    const packs = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/portal-entitlement-packs.tsx',
      ),
      'utf8',
    );
    const downloadPage = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/portal-download-detail-page.tsx',
      ),
      'utf8',
    );
    const audioPage = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/portal-audio-player-page.tsx',
      ),
      'utf8',
    );

    expect(router).toContain("path: 'my-portal/downloads/:orderId'");
    expect(router).toContain("path: 'my-portal/audio/:orderId'");
    expect(router).toContain('portal-download-detail-page');
    expect(router).toContain('portal-audio-player-page');

    expect(packs).toContain('/my-portal/downloads/');
    expect(packs).toContain('/my-portal/audio/');
    expect(packs).toContain('<Trans message="Open" />');

    const actions = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/portal-pack-actions.ts',
      ),
      'utf8',
    );

    expect(downloadPage).toContain('/my-portal?section=downloads');
    expect(downloadPage).toContain('lg:grid-cols-[minmax(0,1fr)_340px]');
    expect(downloadPage).toContain('Your files');
    expect(downloadPage).toContain('Download all');
    expect(downloadPage).toContain('Resend receipt');
    expect(actions).toContain(
      '/api/v1/public/my-portal/purchases/${order.id}/downloads/',
    );
    expect(downloadPage).not.toContain('@app/account-settings');
    expect(downloadPage).not.toContain('License key');
    expect(downloadPage).not.toContain('Version history');

    expect(audioPage).toContain('/my-portal?section=audio');
    expect(audioPage).toContain('lg:grid-cols-[minmax(0,1fr)_340px]');
    expect(audioPage).toContain('<audio');
    expect(audioPage).toContain('Previous track');
    expect(audioPage).toContain('Next track');
    expect(audioPage).toContain('Resend receipt');
    expect(audioPage).not.toContain('@app/account-settings');
    expect(audioPage).not.toContain('BPM');
    expect(audioPage).not.toContain("'WAV'");
  });
});
