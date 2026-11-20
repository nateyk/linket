import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const selectorSource = fs.readFileSync(
  path.resolve(
    'common/foundation/resources/client/uploads/components/cropped-image-selector.tsx',
  ),
  'utf8',
);

const cropCss = fs.readFileSync(
  path.resolve(
    'common/foundation/resources/client/shadcn/image-crop/image-crop-frame.css',
  ),
  'utf8',
);

const cropSource = fs.readFileSync(
  path.resolve(
    'common/foundation/resources/client/shadcn/image-crop/image-crop.tsx',
  ),
  'utf8',
);

describe('cropped image selector', () => {
  test('empty state accepts dropped images into the crop flow', () => {
    expect(selectorSource).toContain('onDrop={handleDrop}');
    expect(selectorSource).toContain('isDragging');
    expect(selectorSource).toContain('border-primary bg-primary/5');
  });

  test('footer uses Dialog.Footer without overriding col-reverse', () => {
    expect(selectorSource).toContain('<Dialog.Footer');
    expect(selectorSource).toContain('flex-row flex-wrap items-center');
    expect(selectorSource).not.toContain('flex items-center justify-end');
    expect(selectorSource).not.toContain('sm:justify-between');
    expect(selectorSource).not.toContain('ml-4');
  });

  test('uses semantic tokens, no hardcoded white surfaces', () => {
    expect(selectorSource).toContain('bg-card');
    expect(selectorSource).not.toContain('bg-white shadow-sm');
    expect(selectorSource).not.toContain('bg-white/30');
  });

  test('dialog title reuses the field label when provided', () => {
    expect(selectorSource).toMatch(
      /Dialog\.Title[\s\S]{0,120}?label[\s\S]{0,80}?Crop image/,
    );
  });

  test('CroppedAvatar defers rounding to previewClassName / cropRadius', () => {
    expect(selectorSource).toContain(
      'const storefrontShape = Boolean(props.previewClassName || props.cropRadius);',
    );
    expect(selectorSource).toContain(
      "shape={storefrontShape ? 'square' : 'circle'}",
    );
  });

  test('dropzone copy matches the shared image-selector phrasing', () => {
    expect(selectorSource).toContain(
      'Select file to upload or drag-and-drop file',
    );
  });

  test('explains the size limit and that large images are compressed before upload', () => {
    expect(selectorSource).toContain(
      'JPG, PNG, or WebP up to :size. Large images are compressed to WebP automatically.',
    );
    expect(selectorSource).toContain('validateEncodedImage');
  });

  test('filled-state menu is discoverable even without hovering', () => {
    expect(selectorSource).toContain('absolute opacity-100');
    expect(selectorSource).toContain('size-8 rounded-full');
    expect(selectorSource).not.toContain('group-hover:opacity-100');
  });

  test('cover dropzone and preview share the crop aspect ratio', () => {
    expect(selectorSource).toContain('aspectRatio: String(aspect)');
    expect(selectorSource).toMatch(
      /export function CroppedCover[\s\S]*?className=\{cn\('w-full', props\.className\)\}/,
    );
    expect(selectorSource).not.toContain("'h-32 w-full sm:h-40'");
  });

  test('crop dialog body does not grow into empty whitespace', () => {
    expect(selectorSource).toContain('flex-none grow-0');
    expect(selectorSource).toContain('gap-2.5');
    expect(selectorSource).toContain('max-h-[calc(100dvh-1rem)]');
    expect(selectorSource).toContain('Dialog.Description className="sr-only"');
  });

  test('crop dialog actions remain on a single compact row when they fit', () => {
    expect(selectorSource).toContain('flex-row flex-wrap items-center justify-end');
    expect(selectorSource).toContain('className="mr-auto px-2"');
    expect(selectorSource).toContain('Apply crop');
  });

  test('crop dialog width follows crop aspect (square tight, cover wide)', () => {
    expect(selectorSource).toContain('sm:max-w-sm');
    expect(selectorSource).toContain('sm:max-w-2xl');
    expect(selectorSource).toContain('sm:max-w-xl');
    expect(selectorSource).toContain('p-3 sm:p-4');
    expect(selectorSource).toContain(
      "'max-w-[min(calc(100vw-2rem),24rem)] sm:max-w-sm'",
    );
  });
});

describe('image crop stage density', () => {
  test('stage wash is quieter than the stock sample and uses token mixes', () => {
    expect(cropCss).toMatch(/color-mix\(in srgb, var\(--color-background\) 5[0-9]%/);
    expect(cropCss).toMatch(/color-mix\(in srgb, var\(--color-foreground\) 2[0-9]%/);
  });
});

describe('image crop stage chrome', () => {
  test('overrides stock react-easy-crop white rim and black wash', () => {
    expect(cropCss).toContain('image-crop-stage');
    expect(cropCss).toContain('--color-foreground');
    expect(cropCss).toContain('--color-background');
    expect(cropCss).not.toMatch(/rgba\(255,\s*255,\s*255/);
  });

  test('Apply and Reset fall back to shadcn Button, not raw button recipes', () => {
    expect(cropSource).toContain("import {Button} from '@shadcn/button/button'");
    expect(cropSource).toMatch(
      /export function ImageCropApply[\s\S]*?<Button/,
    );
    expect(cropSource).toMatch(
      /export function ImageCropReset[\s\S]*?<Button/,
    );
    expect(cropSource).not.toContain('hover:bg-primary/90 disabled:opacity-50');
  });

  test('stage carries the themed crop class and Zoom thumb is named', () => {
    expect(cropSource).toContain('image-crop-stage');
    expect(cropSource).toContain('aria-label={trans(message(\'Zoom\'))}');
  });
});

const legacySelectorSource = fs.readFileSync(
  path.resolve('common/foundation/resources/client/uploads/components/image-selector-dialog.tsx'),
  'utf8',
);

describe('image selector upload dialog', () => {
  test('uses the shared aspect-aware stage instead of a fixed 320px crop box', () => {
    expect(legacySelectorSource).toContain('cropStageBoxStyle');
    expect(legacySelectorSource).toContain('image-crop-stage');
    expect(legacySelectorSource).not.toContain('mb-4 h-80');
    expect(legacySelectorSource).toContain('max-h-[calc(100dvh-1rem)]');
  });

  test('provides visible zoom, labelled controls and compact upload actions', () => {
    expect(legacySelectorSource).toContain('HookForm.FieldContext.Provider');
    expect(legacySelectorSource).toContain("aria-label={trans(message('Zoom'))}");
    expect(legacySelectorSource).toContain('flex-row flex-wrap items-center');
    expect(legacySelectorSource).toContain('Dialog.CloseButton');
    expect(legacySelectorSource).toContain('Crop image area');
  });
});
