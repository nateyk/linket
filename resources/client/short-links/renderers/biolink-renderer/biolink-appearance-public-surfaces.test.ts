import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import type {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {
  resolveBiolinkButtonAppearance,
  resolveBiolinkPublicAppearanceStyle,
  resolveBiolinkThemeVariables,
  shouldUseLightBiolinkLogo,
} from './biolink-appearance';

const read = (file: string) => fs.readFileSync(path.resolve(file), 'utf8');

const profilePage = read(
  'resources/client/short-links/renderers/biolink-renderer/biolink-layout.tsx',
);
const productPage = read(
  'resources/client/digital-products/public/digital-product-public-pages.tsx',
);
const servicePage = read(
  'resources/client/services/public/public-service-page.tsx',
);
const serviceDialog = read(
  'resources/client/services/public/service-inquiry-dialog.tsx',
);
const appearanceBuilder = read(
  'resources/client/dashboard/stores/store-editor/appearance/biolink-appearance-tab.tsx',
);

describe('SF-05 public appearance parity across store surfaces', () => {
  const cases: Array<{
    label: string;
    appearance: BiolinkAppearanceConfig | null;
  }> = [
    {label: 'default storefront', appearance: null},
    {
      label: 'bright gradient with high-shadow round controls',
      appearance: {
        bgConfig: {
          backgroundImage: 'linear-gradient(90deg, #56ab2f, #a8e063)',
          color: '#ffffff',
        },
        btnConfig: {
          radius: 'rounded-lg',
          shadow: 'strong',
          variant: 'outline',
          color: '#193452',
        },
        fontConfig: {family: 'Inter'},
      } as BiolinkAppearanceConfig,
    },
    {
      label: 'dark gradient with full roundness and solid actions',
      appearance: {
        bgConfig: {backgroundImage: 'linear-gradient(90deg, #29323c, #485563)'},
        btnConfig: {radius: 'rounded-full', shadow: 'soft', variant: 'solid'},
        fontConfig: {family: 'Oswald'},
      } as BiolinkAppearanceConfig,
    },
  ];

  test.each(cases)(
    'keeps foreground, typography, radius and shadow in one public context: $label',
    ({appearance}) => {
      const style = resolveBiolinkPublicAppearanceStyle(appearance);
      expect(style).toMatchObject(resolveBiolinkThemeVariables(appearance));
      expect(style.fontFamily).toBe(appearance?.fontConfig?.family);
      expect(style.color).toBe('var(--biolink-text)');
      expect(style['--biolink-surface-shadow']).toBe(
        resolveBiolinkButtonAppearance(appearance).style.boxShadow || 'none',
      );
    },
  );

  test('all three published page roots reuse the shared public Appearance context', () => {
    expect(profilePage).toContain(
      'resolveBiolinkPublicAppearanceStyle(appearance)',
    );
    expect(productPage).toContain(
      'resolveBiolinkPublicAppearanceStyle(appearance)',
    );
    expect(servicePage).toContain(
      'resolveBiolinkPublicAppearanceStyle(appearance)',
    );
  });

  test('portaled checkout and service inquiry dialogs receive the same public tokens', () => {
    // Base UI portals mount under the document body, outside the page root.
    expect(productPage).toMatch(
      /<Dialog\.Content[\s\S]{0,500}?style=\{resolveBiolinkPublicAppearanceStyle\(appearance\)\}/,
    );
    expect(serviceDialog).toMatch(
      /<Dialog\.Content[\s\S]{0,500}?style=\{resolveBiolinkPublicAppearanceStyle\(appearance\)\}/,
    );
  });

  test('product and course pages use the same background effect renderer as creator and service pages', () => {
    expect(profilePage).toContain('<Background');
    expect(servicePage).toContain('<Background appearance={appearance} />');
    expect(productPage).toContain(
      '<Background appearance={appearance ?? null} className="inset-0 -z-10" />',
    );
    expect(productPage).not.toContain('function ProductBackground(');
    expect(productPage).not.toContain('getImageBackgroundEffectStyle');
    expect(productPage).not.toContain('NoiseFilter');
  });

  test('logo contrast uses the effective foreground on light and dark gradient presets', () => {
    expect(
      shouldUseLightBiolinkLogo(
        {
          bgConfig: {
            backgroundImage: 'linear-gradient(90deg, #56ab2f, #a8e063)',
            color: '#ffffff', // a stale editor choice; the renderer corrects to ink
          },
        },
        true,
      ),
    ).toBe(false);
    expect(
      shouldUseLightBiolinkLogo(
        {
          bgConfig: {
            backgroundImage: 'linear-gradient(90deg, #29323c, #485563)',
          },
        },
        false,
      ),
    ).toBe(true);
    expect(shouldUseLightBiolinkLogo(null, true)).toBe(true);
    expect(shouldUseLightBiolinkLogo(null, false)).toBe(false);
  });

  test('Appearance editor describes global public surfaces rather than only the creator profile', () => {
    expect(appearanceBuilder).toContain(
      'Customize your public storefront, products, and services.',
    );
    expect(appearanceBuilder).toContain(
      'Style storefront buttons and customer actions.',
    );
    expect(appearanceBuilder).toContain(
      'Choose the storefront font and text color.',
    );
  });
});