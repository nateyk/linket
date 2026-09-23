import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {
  aspectFitCropSize,
  coverZoomForCrop,
} from '@shadcn/image-crop/image-crop';

describe('crop window math', () => {
  test('aspectFitCropSize fills stage width for landscape ratios', () => {
    expect(aspectFitCropSize(740, 460, 16 / 9)).toEqual({
      width: 740,
      height: 740 / (16 / 9),
    });
  });
  test('aspectFitCropSize fits height when the ratio is taller than the stage', () => {
    expect(aspectFitCropSize(740, 200, 16 / 9)).toEqual({
      width: 200 * (16 / 9),
      height: 200,
    });
  });
  test('coverZoomForCrop pre-zooms portrait media to fill the window', () => {
    const zoom = coverZoomForCrop(900, 1600, 740, 460, 740);
    expect(zoom).toBeGreaterThan(1);
    expect(zoom).toBeLessThanOrEqual(3);
  });
  test('coverZoomForCrop stays at 1 for landscape media', () => {
    expect(coverZoomForCrop(1600, 900, 740, 460, 740)).toBe(1);
  });
  test('coverZoomForCrop guards empty inputs', () => {
    expect(coverZoomForCrop(0, 0, 0, 0, 0)).toBe(1);
  });
});

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
    expect(source).toContain('aspect = 1,');
    // pan-the-image engine with a locked aspect window
    expect(source).toContain('<Cropper');
    expect(source).toContain('onCropComplete');
    expect(source).toContain('lockedAspect');
    expect(source).toContain('Number.isFinite(aspect)');
    // aspect is fixed by the caller: no switch UI, no free-form path
    expect(source).not.toContain('CROP_ASPECT_OPTIONS');
    expect(source).not.toContain('ImageCropAspectSelect');
    expect(source).not.toContain('setAspect');
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

    expect(cropSource).toContain('h-[min(34dvh,420px)]');
    expect(cropSource).toContain('sm:h-[min(52dvh,520px)]');
    expect(selectorSource).toContain('sm:max-w-2xl');
    expect(cropSource).not.toContain('sm:h-[460px]');
    expect(cropSource).not.toContain('min-h-[320px]');
    // fixed window, no scroll: the image pans under it to reach any region
    expect(cropSource).toContain('overflow-hidden');
    expect(cropSource).not.toContain('overflow-auto');
    // window measured from the stage, portrait media opens pre-zoomed to cover
    expect(cropSource).toContain('ResizeObserver');
    expect(cropSource).toContain('cropSize={cropSize}');
    expect(cropSource).toContain('onMediaLoaded');
    expect(cropSource).toContain('coverZoomForCrop');
    expect(cropSource).toContain('aspectFitCropSize');
    expect(cropSource).toContain('minZoom={minZoom}');
    // observer re-attaches when the stage mounts (imageUrl), never stuck on null ref
    expect(cropSource).toContain('stageSizeRef');
    expect(cropSource).toContain('}, [imageUrl]);');
    // provider wrapper allows shrinking so the dialog cap holds and the
    // body scrolls instead of pushing the footer out of the card
    expect(cropSource).toContain('flex min-h-0 w-full flex-col gap-3');
    // slider-driven zoom with themed thumb, clamped minZoom-3
    expect(cropSource).toContain('<Slider');
    expect(cropSource).toContain('bg-primary ring-primary/30');
    expect(cropSource).toContain('Math.min(3');
    expect(cropSource).not.toContain('zoomIn');
    expect(cropSource).not.toContain('zoomOut');
    expect(cropSource).not.toContain('ImageCropZoomControls');
    // ratio always locked to the caller aspect, remount is keyed to the
    // measured window so the engine starts from final values
    expect(cropSource).toContain('lockedAspect');
    expect(cropSource).toContain('Number.isFinite(aspect)');
    expect(cropSource).toContain('cropperKey');
    expect(cropSource).not.toContain("'free'");
    expect(selectorSource.match(/<Dialog\.Root/g)).toHaveLength(1);
    expect(selectorSource).toContain('flex items-center justify-end');
  });
});
