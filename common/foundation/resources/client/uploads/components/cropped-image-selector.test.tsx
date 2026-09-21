import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('cropped image selector', () => {
  test('empty state accepts dropped images into the crop flow', () => {
    const source = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/uploads/components/cropped-image-selector.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('onDrop={handleDrop}');
    expect(source).toContain('isDragging');
    expect(source).toContain('border-primary bg-primary/5');
  });
  test('crop dialog footer offers tooltip zoom controls', () => {
    const source = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/uploads/components/cropped-image-selector.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('ImageCropZoomControls');
  });
  test('uses semantic tokens, no hardcoded white surfaces', () => {
    const source = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/uploads/components/cropped-image-selector.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('bg-card');
    expect(source).not.toContain('bg-white shadow-sm');
  });
});
