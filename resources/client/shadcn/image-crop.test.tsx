import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('reusable image crop composer', () => {
  test('exposes aspect-aware crop primitives matching kibo sample', () => {
    const candidatePaths = [
      'common/foundation/resources/client/shadcn/image-crop/image-crop.tsx',
      'common/foundation/resources/client/ui/image-crop/image-crop.tsx',
    ];
    const existing = candidatePaths.find(p => fs.existsSync(path.resolve(p)));
    expect(existing, 'image-crop component file should exist').toBeDefined();
    const source = fs.readFileSync(path.resolve(existing!), 'utf8');
    expect(source).toContain('ImageCrop');
    expect(source).toContain('ImageCropContent');
    expect(source).toContain('ImageCropApply');
    expect(source).toContain('ImageCropReset');
    expect(source).toContain('aspect');
    expect(source).toContain('onCrop');
    expect(source).toContain('react-easy-crop');
    expect(source).toContain('getCroppedImage');
  });

  test('supports avatar, course cover and product card ratios', () => {
    const source = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/shadcn/image-crop/image-crop.tsx',
      ),
      'utf8',
    );
    // default aspect 1 and ability to pass any number (checked via aspect prop)
    expect(source).toMatch(/aspect\s*\??\s*:\s*number/);
    expect(source).toMatch(/aspect\s*=\s*1/);
    // pan-the-image engine with a locked aspect window
    expect(source).toContain('<Cropper');
    expect(source).toContain('onCropComplete');
    expect(source).toContain('lockedAspect');
    expect(source).toContain('Number.isFinite(aspect)');
  });

  test('uses viewport-safe sizing with a single selector dialog tree', () => {
    const cropSource = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/shadcn/image-crop/image-crop.tsx',
      ),
      'utf8',
    );
    const selectorSource = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/uploads/components/cropped-image-selector.tsx',
      ),
      'utf8',
    );

    expect(cropSource).toContain('h-[min(50dvh,420px)]');
    expect(cropSource).not.toContain('sm:h-[460px]');
    expect(cropSource).not.toContain('min-h-[320px]');
    // fixed window, no scroll: the image pans under it to reach any region
    expect(cropSource).toContain('overflow-hidden');
    expect(cropSource).not.toContain('overflow-auto');
    // slider-driven zoom with themed thumb, clamped 1-3
    expect(cropSource).toContain('<Slider');
    expect(cropSource).toContain('bg-primary ring-primary/30');
    expect(cropSource).toContain('Math.min(3');
    expect(cropSource).toContain('Math.max(1');
    expect(cropSource).not.toContain('zoomIn');
    expect(cropSource).not.toContain('zoomOut');
    expect(cropSource).not.toContain('ImageCropZoomControls');
    // ratio can never unlock into free-form/square selection
    expect(cropSource).toContain('lockedAspect');
    expect(cropSource).toContain('Number.isFinite(aspect)');
    expect(selectorSource.match(/<Dialog\.Root/g)).toHaveLength(1);
    expect(selectorSource).toContain(
      'flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end',
    );
  });
});
