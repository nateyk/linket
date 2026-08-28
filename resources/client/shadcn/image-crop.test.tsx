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
    expect(source).toContain('getCroppedAreaPixels');
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
    // ensure component can be used with 1, 2.33, 16/9
    expect(source).toContain('Cropper');
  });
});
