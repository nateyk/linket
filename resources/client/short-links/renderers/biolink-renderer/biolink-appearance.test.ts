import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {BiolinkAppearanceConfigBtnConfig} from '@app/gen/schemas/biolink-appearance-config-btn-config';
import {
  deriveGradientTextColor,
  GradientBackgrounds,
  measureContrastRatio,
  MIN_TEXT_CONTRAST,
  sampleGradientAverage,
} from '@common/background-selector/gradients/gradient-backgrounds';
import {
  BiolinkContainerRadius,
  ResolvedBiolinkButtonAppearance,
  resolveBiolinkButtonAppearance,
  resolveBiolinkContainerRadius,
  resolveBiolinkRadiusVariables,
  resolveBiolinkSegmentedTabsAppearance,
  resolveBiolinkThemeVariables,
} from './biolink-appearance';

type RadiusSetting = NonNullable<BiolinkAppearanceConfigBtnConfig['radius']>;

const radiusSettings: RadiusSetting[] = [
  'rounded-none',
  'rounded-sm',
  'rounded-lg',
  'rounded-full',
];

function readSource(file: string): string {
  return fs.readFileSync(
    path.resolve(
      'resources/client/short-links/renderers/biolink-renderer',
      file,
    ),
    'utf8',
  );
}

describe('corner roundness radius variables', () => {
  const systemVariables = {
    '--be-radius-button': 'var(--radius-3xl)',
    '--be-radius-input': 'var(--radius-xl)',
    '--be-radius-card': 'var(--radius-3xl)',
    '--be-radius-card-sm': 'var(--radius-2xl)',
    '--be-radius-card-xs': 'var(--radius-xl)',
  };

  test('renders the core UI radius tokens before the creator picks anything', () => {
    expect(resolveBiolinkRadiusVariables(null)).toEqual(systemVariables);
    expect(resolveBiolinkRadiusVariables(undefined)).toEqual(systemVariables);
    expect(resolveBiolinkRadiusVariables({btnConfig: {}})).toEqual(
      systemVariables,
    );
  });

  test('steps controls, fields and surfaces through one shared scale', () => {
    const cases: Record<RadiusSetting, Record<string, string>> = {
      'rounded-none': {
        '--be-radius-button': '0',
        '--be-radius-input': '0',
        '--be-radius-card': '0',
        '--be-radius-card-sm': '0',
        '--be-radius-card-xs': '0',
      },
      'rounded-sm': {
        '--be-radius-button': '4px',
        '--be-radius-input': '12px',
        '--be-radius-card': '8px',
        '--be-radius-card-sm': '8px',
        '--be-radius-card-xs': '8px',
      },
      'rounded-lg': {
        '--be-radius-button': '8px',
        '--be-radius-input': '16px',
        '--be-radius-card': '24px',
        '--be-radius-card-sm': '24px',
        '--be-radius-card-xs': '12px',
      },
      'rounded-full': {
        '--be-radius-button': '9999px',
        '--be-radius-input': '24px',
        '--be-radius-card': '32px',
        '--be-radius-card-sm': '32px',
        '--be-radius-card-xs': '16px',
      },
    };

    for (const setting of radiusSettings) {
      expect(
        resolveBiolinkRadiusVariables({btnConfig: {radius: setting}}),
      ).toEqual(cases[setting]);
    }
  });

  test('gives every surface token one radius, whichever one a component reaches for', () => {
    for (const setting of radiusSettings) {
      const variables = resolveBiolinkRadiusVariables({
        btnConfig: {radius: setting},
      });
      expect(variables['--be-radius-card']).toBe(
        variables['--be-radius-card-sm'],
      );
    }
  });

  test('renders Round containers at the admin Round card radius', () => {
    // The admin theme's Round (`.radius-sm` in common-tailwind.css) maps the
    // card tokens to `var(--radius-lg)` — 8px by Tailwind default. Storefront
    // Round must resolve its containers to that same length, or Round reads
    // as Rounder next to the dashboard.
    const round = resolveBiolinkRadiusVariables({
      btnConfig: {radius: 'rounded-sm'},
    });
    expect(round['--be-radius-card']).toBe('8px');
    expect(round['--be-radius-card-sm']).toBe('8px');

    const container = resolveBiolinkContainerRadius({
      btnConfig: {radius: 'rounded-sm'},
    });
    expect(container.value).toBe('8px');
    expect(container.avatarValue).toBe('8px');
  });

  test('matches the length the roundness knob draws its own tiles with', () => {
    // The selector keeps drawing `rounded-none|sm|lg|full`; the button radius
    // has to resolve to the same length as those utilities, or the storefront
    // button and the rest of the scale would disagree.
    const utilityLengths: Record<RadiusSetting, string> = {
      'rounded-none': '0',
      'rounded-sm': '4px',
      'rounded-lg': '8px',
      'rounded-full': '9999px',
    };

    for (const setting of radiusSettings) {
      expect(
        resolveBiolinkRadiusVariables({btnConfig: {radius: setting}})[
          '--be-radius-button'
        ],
      ).toBe(utilityLengths[setting]);
    }
  });

  test('ships with the theme variables the public page root applies', () => {
    expect(
      resolveBiolinkThemeVariables({btnConfig: {radius: 'rounded-lg'}}),
    ).toMatchObject({'--be-radius-card': '24px'});
    expect(resolveBiolinkThemeVariables(null)).toMatchObject(systemVariables);
    // An unparseable background color falls back to the defaults, radius in tow.
    expect(
      resolveBiolinkThemeVariables({
        bgConfig: {color: 'definitely-not-a-color'},
        btnConfig: {radius: 'rounded-lg'},
      }),
    ).toMatchObject({'--be-radius-card': '24px'});
  });

  test('painted stores claim the site token set; unpainted ones need nothing', () => {
    // Inside a painted store every dashboard-token primitive (outline
    // buttons, accordion chevrons, hover washes) must resolve from the
    // store's own surface, or it flips under a dark OS scheme and ghosts
    // out on the painted card faces.
    const painted = resolveBiolinkThemeVariables({
      bgConfig: {backgroundImage: DARK_GRADIENT, color: '#ffffff'},
    });
    expect(painted['--be-foreground']).toBe('var(--biolink-text)');
    expect(painted['--be-muted-foreground']).toBe('var(--biolink-muted-text)');
    expect(painted['--be-border']).toBe('var(--biolink-border)');
    expect(painted['--be-accent']).toBe('var(--biolink-surface-muted)');
    expect(painted['--be-background']).toBe('var(--biolink-surface-strong)');
    expect(painted['--be-card']).toBe('var(--biolink-surface-strong)');
    expect(painted['--be-popover']).toBe('var(--biolink-surface-strong)');
    expect(painted['--be-primary']).toBe('var(--biolink-accent)');

    // An unpainted storefront sits directly on the site theme — the
    // dashboard tokens stay coherent there, so nothing is claimed.
    const unpainted = resolveBiolinkThemeVariables(null);
    expect(unpainted['--be-foreground']).toBeUndefined();
    expect(unpainted['--be-border']).toBeUndefined();
    expect(unpainted['--be-accent']).toBeUndefined();
  });

  test('button chrome rounds through --be-radius-button, not the setting utility class', () => {
    for (const setting of radiusSettings) {
      const resolved = resolveBiolinkButtonAppearance({
        btnConfig: {radius: setting},
      });
      expect(resolved.radius).toBe(setting);
      expect(resolved.className).toContain('rounded-button');
      expect(resolved.className.split(/\s+/)).not.toContain(setting);
    }
  });
});

describe('Appearance editor → storefront contract', () => {
  const layout = readSource('biolink-layout.tsx');
  const creator = readSource('creator-profile-layout.tsx');
  const background = fs.readFileSync(
    path.resolve(
      'resources/client/short-links/renderers/biolink-renderer/biolink-background.tsx',
    ),
    'utf8',
  );
  const shop = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.tsx',
    ),
    'utf8',
  );

  test('Background paints through biolink Background + theme tokens', () => {
    expect(layout).toContain('<Background');
    expect(layout).toContain('resolveBiolinkPublicAppearanceStyle(appearance)');
    expect(background).toContain('cssPropsFromBgConfig(appearance?.bgConfig)');
  });

  test('Buttons style Message, socials, nav active, and product View', () => {
    expect(creator).toContain('style={buttonAppearance.style}');
    expect(creator).toContain('activeButtonStyle={buttonAppearance.style}');
    expect(creator).toContain('className={buttonAppearance.className}');
    // The shop may wrap the action classes in cn(); assert the resolved
    // appearance values reach it rather than one exact JSX shape.
    expect(shop).toContain('buttonAppearance.className');
    expect(shop).toContain('style={buttonAppearance.style}');
  });

  test('Text typeface and foreground flow from fontConfig + bgConfig.color', () => {
    expect(layout).toContain('appearance?.fontConfig');
    expect(layout).toContain('loadFonts([');
    expect(layout).toContain('resolveBiolinkPublicAppearanceStyle(appearance)');
    const appearanceResolver = readSource('biolink-appearance.ts');
    expect(appearanceResolver).toContain('fontFamily: appearance?.fontConfig?.family');
    expect(appearanceResolver).toContain("color: 'var(--biolink-text)'");
  });

  test('Branding hideBranding is honored on creator and sidebar lockups', () => {
    expect(creator).toContain('appearance?.hideBranding');
    expect(layout).toContain('appearance?.hideBranding');
  });

  test('product page shell also honors hideBranding', () => {
    const productPage = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/digital-product-public-pages.tsx',
      ),
      'utf8',
    );
    expect(productPage).toContain('function ProductBranding');
    expect(productPage).toContain('appearance?.hideBranding');
    expect(productPage).toContain('shouldUseLightBiolinkLogo');
  });
});

describe('storefront appearance token wiring', () => {
  test('sticky Products/About strip does not leak dashboard bg-background', () => {
    const source = readSource('store-front.tsx');
    expect(source).not.toMatch(/sticky[\s\S]{0,200}?bg-background/);
    expect(source).toMatch(/sticky[\s\S]{0,200}?bg-transparent/);
  });

  test('Products/About segmented Tabs follow Appearance button color + roundness', () => {
    const source = readSource('store-front.tsx');
    expect(source).toContain('resolveBiolinkSegmentedTabsAppearance');
    expect(source).toContain('style={segmented.style}');
    expect(source).toContain('indicatorClass={segmented.indicatorClassName}');
    expect(source).toContain('className={segmented.tabClassName}');
    expect(source).not.toContain('variant="line"');
    expect(source).not.toContain('rounded-full');

    const segmented = resolveBiolinkSegmentedTabsAppearance({
      btnConfig: {radius: 'rounded-sm', shadow: 'strong', color: '#000000'},
    });
    expect(segmented.listClassName).toContain('rounded-button');
    expect(segmented.listClassName).toContain(
      'bg-[var(--biolink-surface-strong)]',
    );
    expect(segmented.listClassName).toContain(
      'group-data-horizontal/tabs:h-auto',
    );
    // Soft-pop Strong/Hard need inset room so the cast sits inside the
    // track — symmetric, so the active pill stays centred instead of
    // hugging the top-left corner.
    expect(segmented.listClassName).toContain('p-2');
    expect(segmented.listClassName).not.toContain('pe-3');
    expect(segmented.listClassName).not.toContain('pb-3');
    expect(segmented.indicatorClassName).toContain(
      '[background:var(--biolink-button-background)]!',
    );
    // The pill wears the creator's roundness token, same as the track.
    expect(segmented.indicatorClassName).toContain('rounded-button');
    expect(segmented.tabClassName).toContain(
      'data-active:text-[var(--biolink-button-text)]!',
    );
    expect(segmented.style).toMatchObject({
      '--biolink-button-background': '#000000',
      '--biolink-tab-active-shadow':
        'rgb(0 0 0 / 30%) 0.3rem 0.3rem 0.4rem 0px',
    });

    const flat = resolveBiolinkSegmentedTabsAppearance({
      btnConfig: {radius: 'rounded-sm', shadow: 'none', color: '#000000'},
    });
    expect(flat.listClassName).toContain('p-1');
    expect(flat.listClassName).not.toContain('pe-3');
    expect(flat.indicatorClassName).toContain('rounded-button');
  });

  test('sidebar biolink shell paints from --biolink tokens', () => {
    const source = readSource('biolink-layout.tsx');
    expect(source).toContain('bg-[var(--biolink-surface)]');
    expect(source).toContain('text-[var(--biolink-text)]');
    expect(source).not.toContain('bg-background/45');
    expect(source).not.toContain('text-foreground shadow-lg');
  });

  test('sidebar shop column forwards live appearance into the shop widget', () => {
    const source = readSource('biolink-layout.tsx');
    expect(source).toMatch(
      /function ShopColumn[\s\S]*?appearance[\s\S]*?appearance=\{appearance\}/,
    );
  });
});

describe('container corner roundness', () => {
  test('falls back to the core UI card token when the creator picked nothing', () => {
    const appearances: (BiolinkAppearanceConfig | null | undefined)[] = [
      null,
      undefined,
      {btnConfig: {}},
    ];

    for (const appearance of appearances) {
      // The page remaps `--be-radius-card` for an unset roundness too, so the
      // crop preview has to read the length off the same scale.
      const remapped = resolveBiolinkRadiusVariables(appearance);

      expect(resolveBiolinkContainerRadius(appearance)).toEqual({
        className: 'rounded-card',
        avatarClassName: 'rounded-card',
        value: remapped['--be-radius-card'],
        avatarValue: remapped['--be-radius-card'],
      });
    }
  });

  test('steps the four settings up to the container radius scale', () => {
    const cases: Record<
      RadiusSetting,
      {
        className: BiolinkContainerRadius;
        avatarClassName: BiolinkContainerRadius | 'rounded-full';
      }
    > = {
      'rounded-none': {
        className: 'rounded-none',
        avatarClassName: 'rounded-none',
      },
      'rounded-sm': {
        className: 'rounded-card-sm',
        avatarClassName: 'rounded-card-sm',
      },
      'rounded-lg': {
        className: 'rounded-card',
        avatarClassName: 'rounded-card',
      },
      'rounded-full': {
        className: 'rounded-4xl',
        avatarClassName: 'rounded-full',
      },
    };

    for (const setting of radiusSettings) {
      const resolved = resolveBiolinkContainerRadius({
        btnConfig: {radius: setting},
      });

      expect({
        className: resolved.className,
        avatarClassName: resolved.avatarClassName,
      }).toEqual(cases[setting]);
    }
  });

  test('crop frames get the length the page renders with', () => {
    // The crop dialog is portalled into the dashboard, outside the biolink root
    // that remaps `--be-radius-*`, so these are the remapped lengths themselves
    // rather than `var(--radius-card*)` (which would resolve to the dashboard's
    // radius in there).
    const cases: Record<RadiusSetting, {value: string; avatarValue: string}> = {
      'rounded-none': {value: '0px', avatarValue: '0px'},
      'rounded-sm': {value: '8px', avatarValue: '8px'},
      'rounded-lg': {value: '24px', avatarValue: '24px'},
      'rounded-full': {value: 'var(--radius-4xl)', avatarValue: '9999px'},
    };

    for (const setting of radiusSettings) {
      const resolved = resolveBiolinkContainerRadius({
        btnConfig: {radius: setting},
      });

      expect({
        value: resolved.value,
        avatarValue: resolved.avatarValue,
      }).toEqual(cases[setting]);
    }
  });
});

describe('creator profile card wiring', () => {
  const source = readSource('creator-profile-layout.tsx');

  test('drives the card shell, avatar and About panel from one radius', () => {
    expect(source).toContain('resolveBiolinkContainerRadius(appearance)');
    expect(source).toMatch(
      /'gap-0 py-0 bg-\[var\(--biolink-surface\)\][^']*'[\s\S]*?containerRadius\.className/,
    );
    expect(source).toMatch(
      /<Avatar\.Root\s+className=\{cn\(\s*'[^']*'[\s\S]{0,200}?containerRadius\.avatarClassName/,
    );
    expect(source).toMatch(
      /<Avatar\.ColorFallback[\s\S]{0,200}?containerRadius\.avatarClassName/,
    );
    expect(source).not.toContain('style={avatarInnerStyle}');
    expect(source).toMatch(
      /function AboutSection[\s\S]*?containerRadius\.className/,
    );
    expect(source).not.toContain('rounded-card-sm');
  });

  test('passes the remapped button radius token to the bottom navigation bar', () => {
    // Setting names (rounded-sm|lg|…) bypass --be-radius-button; rounded-button
    // is what the Appearance radius scale remaps on the page root.
    expect(source).toContain('radius="rounded-button"');
    expect(source).not.toContain('radius={buttonAppearance.radius}');
  });

  test('shop View actions receive the same live appearance as the rest of the card', () => {
    expect(source).toMatch(
      /function ShopSection[\s\S]*?appearance[\s\S]*?<ShopWidgetRenderer[\s\S]*?appearance=\{appearance\}/,
    );
  });

  test('passes the resolved button appearance to the bottom navigation bar', () => {
    expect(source).toContain(
      'activeButtonClassName={buttonAppearance.className}',
    );
    expect(source).toContain('activeButtonStyle={buttonAppearance.style}');
  });

  test('shares the surface ring edge and Appearance shadow soft-pop on the shell', () => {
    // Edge chrome = shared --biolink-border ring. Depth = Buttons → Shadow.
    expect(source).toMatch(
      /'gap-0 py-0 bg-\[var\(--biolink-surface\)\][\s\S]{0,120}?biolinkSurfaceEdgeClassName/,
    );
    expect(source).toMatch(
      /const buttonShadow = buttonAppearance\.style\.boxShadow;[\s\S]{0,400}?style=\{\{boxShadow: buttonShadow\}\}/,
    );

    // The Card primitive itself stays flat; soft-pop is the inline style.
    const cardPrimitive = fs.readFileSync(
      path.resolve('common/foundation/resources/client/shadcn/card/card.tsx'),
      'utf8',
    );
    const cardRoot = cardPrimitive.match(/'group\/card[^']*'/)?.[0];
    expect(cardRoot).toBeTruthy();
    expect(cardRoot).not.toMatch(/shadow/);
  });

  test('frames the avatar at the size the editor previews', () => {
    expect(source).toContain('-mt-10 aspect-square size-22');
    // Edge-to-edge photo — no heavy p-1 surface pad frame.
    expect(source).not.toContain('bg-[var(--biolink-surface-strong)] p-1');
    expect(source).toContain('ring-2 ring-[var(--biolink-surface)]');
    expect(source).toContain('after:rounded-[inherit]');
  });

  test('sizes name and title beside the avatar without single-line truncate', () => {
    expect(source).toContain('grid-cols-[auto_minmax(0,1fr)] items-end');
    expect(source).toContain('text-xl leading-snug font-semibold');
    expect(source).toContain('sm:text-2xl');
    expect(source).toContain('line-clamp-2 text-sm leading-snug');
    // Truncating the title to one ellipsis line hid roles like Architect.
    expect(source).not.toContain(
      'mt-0.5 truncate text-sm text-[var(--biolink-muted-text)]',
    );
  });

  test('rings the avatar with the wrapper radius at every setting', () => {
    // The shared Avatar primitive draws its ring as `after:rounded-full`; the
    // storefront wrapper carries `avatarClassName` instead, so the ring
    // inherits the wrapper radius rather than pinning a circle — except Full,
    // where the wrapper itself is a true circle.
    expect(source).toContain('after:rounded-[inherit]');
    expect(source).not.toContain('after:hidden');
    expect(source).not.toContain('after:rounded-full');
  });

  test('does not nest a tighter inner radius under a pad frame', () => {
    expect(source).not.toContain('avatarInnerStyle');
    expect(source).not.toContain('calc(${containerRadius.avatarValue} - 4px)');
  });

  test('draws the cover at the 3:1 box the editor crops to', () => {
    expect(source).toContain('className="relative aspect-[3/1] w-full');
  });

  test('keeps the cover image clipped by the card shell instead of rounding it', () => {
    expect(source).toMatch(
      /className="size-full object-cover"\s+src=\{profile\.cover_url\}/,
    );
  });
});

describe('storefront surface edge chrome', () => {
  const layoutSource = readSource('creator-profile-layout.tsx');
  const appearanceSource = fs.readFileSync(
    path.resolve(
      'resources/client/short-links/renderers/biolink-renderer/biolink-appearance.ts',
    ),
    'utf8',
  );
  const shopSource = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.tsx',
    ),
    'utf8',
  );

  test('exports one shared edge token for creator, product, and nav', () => {
    expect(appearanceSource).toContain(
      "export const biolinkSurfaceEdgeClassName =\n  'border-0 ring-1 ring-(color:--biolink-border)'",
    );
  });

  test('creator card, about panel, and bottom nav share biolinkSurfaceEdgeClassName', () => {
    expect(layoutSource).toContain('biolinkSurfaceEdgeClassName');
    // Creator + About + BottomNavBar className — three call sites.
    expect(
      layoutSource.match(/biolinkSurfaceEdgeClassName/g)?.length,
    ).toBeGreaterThanOrEqual(3);
  });

  test('Appearance Buttons → Shadow soft-pops creator and About shells', () => {
    // Storefront must honor the Appearance Shadow control on profile surfaces
    // (Message/social/View already get boxShadow via buttonAppearance.style).
    expect(
      layoutSource.match(
        /const buttonShadow = buttonAppearance\.style\.boxShadow;/g,
      ),
    ).toHaveLength(2);
    expect(layoutSource).toMatch(
      /'gap-0 py-0 bg-\[var\(--biolink-surface\)\][\s\S]{0,400}?style=\{\{boxShadow: buttonShadow\}\}/,
    );
    expect(layoutSource).toMatch(
      /function AboutSection[\s\S]*?'p-5 pb-6',[\s\S]{0,120}?style=\{\{boxShadow: buttonShadow\}\}/,
    );
    expect(
      resolveBiolinkButtonAppearance({btnConfig: {shadow: 'strong'}}).style
        .boxShadow,
    ).toBe('rgb(0 0 0 / 30%) 0.3rem 0.3rem 0.4rem 0px');
    expect(
      resolveBiolinkButtonAppearance({btnConfig: {shadow: 'none'}}).style
        .boxShadow,
    ).toBe('');
  });

  test('product cards share surface edge and Appearance shadow with creator', () => {
    expect(shopSource).toContain('biolinkSurfaceEdgeClassName');
    expect(shopSource).toContain('style={{boxShadow: buttonShadow}}');
    expect(shopSource).not.toContain('shadow-none');
    expect(shopSource).toContain('text-[var(--biolink-text)]');
    expect(shopSource).toContain('variant="ghost"');
    expect(shopSource).not.toContain('titleHref=');
  });

  test('bottom nav no longer stacks a CSS border on top of a second ring', () => {
    expect(layoutSource).not.toContain(
      'border-[var(--biolink-border)] bg-[var(--biolink-surface)]/95',
    );
    expect(layoutSource).not.toContain(
      'ring-[color-mix(in_srgb,var(--biolink-text)_8%,transparent)]',
    );
  });

  test('avatar still lifts with a surface ring, not a button shadow', () => {
    expect(layoutSource).toMatch(
      /<Avatar\.Root\s+className=\{cn\([\s\S]{0,400}?containerRadius\.avatarClassName/,
    );
    expect(layoutSource).not.toMatch(
      /<Avatar\.Root[\s\S]{0,500}?style=\{\{boxShadow:/,
    );
  });

  test('skill chips are soft filled pills that follow Appearance roundness', () => {
    expect(layoutSource).toContain('formatSkillLabel');
    expect(layoutSource).toContain('variant="secondary"');
    expect(layoutSource).toContain('rounded-button');
    // Ink-tinted fill + ring — readable on the white card face.
    expect(layoutSource).toContain(
      'bg-[color-mix(in_srgb,var(--biolink-text)_8%,var(--biolink-surface))]!',
    );
    expect(layoutSource).toContain('ring-1 ring-(color:--biolink-border)');
    expect(layoutSource).toContain('border-transparent');
  });
});

describe('storefront bottom nav appearance wiring', () => {
  const navSource = fs.readFileSync(
    path.resolve(
      'common/foundation/resources/client/shadcn/bottom-nav-bar.tsx',
    ),
    'utf8',
  );

  test('paints the active button from the appearance design, not theme chrome', () => {
    // The style object sets the --biolink-button-* vars on the button; the
    // className paints fill/text/border from those vars, mirroring the
    // social buttons.
    expect(navSource).toContain('activeButtonClassName');
    expect(navSource).toContain('activeButtonStyle');
    expect(navSource).toContain(
      'style={isActive ? activeButtonStyle : undefined}',
    );
    // The old combined active string is gone: when an appearance is provided
    // its classes reach `cn()` unopposed, so no merge order decides the winner.
    expect(navSource).not.toContain(
      '"bg-primary text-primary-foreground shadow-sm gap-2"',
    );
  });

  test('keeps theme chrome as the default when no appearance is passed', () => {
    // The old strings survive only as the fallback for callers that pass no
    // appearance, so the component default is unchanged.
    expect(navSource).toMatch(
      /activeButtonClassName \?\?\s*"bg-primary text-primary-foreground shadow-sm"/,
    );
    expect(navSource).toContain(
      '"text-muted-foreground hover:bg-accent hover:text-accent-foreground"',
    );
    expect(navSource).toContain('bg-card/95');
  });

  test('storefront bottom nav shells with --biolink-* instead of dashboard card chrome', () => {
    const layout = fs.readFileSync(
      path.resolve(
        'resources/client/short-links/renderers/biolink-renderer/creator-profile-layout.tsx',
      ),
      'utf8',
    );
    expect(layout).toContain('bg-[var(--biolink-surface)]/95');
    expect(layout).toContain('inactiveButtonClassName');
    expect(layout).toContain('text-[var(--biolink-muted-text)]');
    expect(layout).toContain(
      "return hasProducts ? 'products' : hasServices ? 'services' : 'profile';",
    );
  });

  test('follows the appearance label color on the active label span', () => {
    // The span would otherwise pin `text-primary-foreground` over the
    // inherited button color; with an appearance it reads the same label var
    // the style object sets on the button.
    expect(navSource).toContain('"text-[var(--biolink-button-text)]"');
    expect(navSource).toMatch(
      /activeButtonClassName\s*\?\s*"text-\[var\(--biolink-button-text\)\]"/,
    );
    expect(navSource).not.toContain('isActive ? "text-primary-foreground"');
  });

  test('leaves the dashboard bottom navbar on its own component', () => {
    const dashboardNav = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/layout/mobile-bottom-navbar.tsx',
      ),
      'utf8',
    );
    expect(dashboardNav).not.toContain('BottomNavBar');
    expect(dashboardNav).not.toContain('bottom-nav-bar');
    expect(navSource).not.toContain('MobileBottomNavbar');
  });
});

describe('creator profile editor wiring', () => {
  const source = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/stores/store-editor/creator-profile-editor.tsx',
    ),
    'utf8',
  );

  test('keeps the editor cover and avatar on dashboard chrome', () => {
    // Corner roundness is a storefront choice, previewed by the phone live
    // preview. The Profile form tiles must not mutate with it — a creator
    // changing a storefront setting should never re-skin the dashboard
    // controls (or the crop dialog frames portalled into it).
    expect(source).not.toContain('resolveBiolinkContainerRadius');
    expect(source).not.toContain('containerRadius');
    expect(source).not.toContain('cropRadius=');
    expect(source).not.toContain('previewClassName=');
    expect(source).not.toContain('--biolink-');
    // The avatar stays a plain dashboard avatar tile, but the approved
    // mobile composition now overlays it on the cover instead of placing it
    // in a separate max-width field.
    expect(source).toContain('className="size-22 max-w-22"');
    expect(source).toContain(
      'className="absolute start-4 bottom-0 z-10 w-fit translate-y-1/2"',
    );
    expect(source).not.toContain('bg-[var(--biolink-surface-strong)]');
  });

  test('crops the cover at the same 3:1 box the card renders', () => {
    expect(source).toContain('aspect={3}');
    // Full-width banner: the tile's inline aspect-ratio drives the height
    // off the column width, so the editor previews the storefront box.
    expect(source).toMatch(/<CroppedCover\s+className="w-full"/);
  });
});

const LIGHT_GREEN_GRADIENT = 'linear-gradient(90deg, #56ab2f, #a8e063)';
const MAUVE_GRADIENT = 'linear-gradient(90deg, #b79891, #94716b)';
const DARK_GRADIENT = 'linear-gradient(90deg, #29323c, #485563)';

function measuredContrast(first: string, second: string): number {
  const ratio = measureContrastRatio(first, second);
  if (ratio === null) {
    throw new Error(`unparseable test pair: ${first} / ${second}`);
  }
  return ratio;
}

function buttonVars(
  resolved: ResolvedBiolinkButtonAppearance,
): Record<string, string> {
  return resolved.style as unknown as Record<string, string>;
}

describe('storefront appearance contrast', () => {
  test('P0-1 stale white on light green gradient derives black text (white vs #7fc549 2.10:1 → black 9.98:1)', () => {
    const average = sampleGradientAverage(LIGHT_GREEN_GRADIENT);
    expect(average).toBe('#7fc549');
    // The failing pair, as carried: white text on the light gradient face.
    expect(measuredContrast('#ffffff', average as string)).toBeLessThan(
      MIN_TEXT_CONTRAST,
    );

    const variables = resolveBiolinkThemeVariables({
      bgConfig: {backgroundImage: LIGHT_GREEN_GRADIENT, color: '#ffffff'},
    });
    expect(variables['--biolink-text']).toBe('#000000');
    expect(
      measuredContrast(
        variables['--biolink-text'] as string,
        average as string,
      ),
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  test('P0-1 absent foreground on mauve gradient derives black text (white vs #a6847e 3.37:1 → black 6.22:1)', () => {
    const average = sampleGradientAverage(MAUVE_GRADIENT);
    expect(average).toBe('#a6847e');
    expect(measuredContrast('#ffffff', average as string)).toBeLessThan(
      MIN_TEXT_CONTRAST,
    );

    const variables = resolveBiolinkThemeVariables({
      bgConfig: {backgroundImage: MAUVE_GRADIENT},
    });
    expect(variables['--biolink-text']).toBe('#000000');
    expect(
      measuredContrast(
        variables['--biolink-text'] as string,
        average as string,
      ),
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  test('P0-1 explicit white on dark gradient is respected untouched (white vs #394450 9.92:1)', () => {
    const average = sampleGradientAverage(DARK_GRADIENT);
    expect(average).toBe('#394450');
    expect(
      measuredContrast('#ffffff', average as string),
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);

    const variables = resolveBiolinkThemeVariables({
      bgConfig: {backgroundImage: DARK_GRADIENT, color: '#ffffff'},
    });
    expect(variables['--biolink-text']).toBe('#ffffff');
  });

  test('P0-1 explicit colors on solid backgrounds keep verbatim behavior', () => {
    // P0-1 is scoped to gradient/image faces; a solid pair is untouched even
    // when it fails, so creators keep full control there.
    const variables = resolveBiolinkThemeVariables({
      bgConfig: {backgroundColor: '#ffffff', color: '#ffffff'},
    });
    expect(variables['--biolink-text']).toBe('#ffffff');
  });

  test('keep-list: white text resolves a black surface with #e0e0e0 muted at 15.91:1', () => {
    const variables = resolveBiolinkThemeVariables({
      bgConfig: {backgroundColor: '#111111', color: '#ffffff'},
    });
    expect(variables['--biolink-text']).toBe('#ffffff');
    expect(variables['--biolink-surface']).toContain('#000');
    expect(variables['--biolink-muted-text']).toBe('#e0e0e0');
    expect(
      measuredContrast(
        variables['--biolink-muted-text'] as string,
        '#000000',
      ).toFixed(2),
    ).toBe('15.91');
  });

  test('P0-2 glass on light gradient derives black text and tint (black vs #79b54b face 8.52:1)', () => {
    const appearance = resolveBiolinkButtonAppearance({
      bgConfig: {backgroundImage: LIGHT_GREEN_GRADIENT},
      btnConfig: {variant: 'glass'},
    });
    expect(buttonVars(appearance)['--biolink-button-text']).toBe('#000000');
    expect(buttonVars(appearance)['--biolink-button-background']).toContain(
      'color-mix(in srgb, #000000 10%, transparent)',
    );
    // Recompute the rendered face independently: 10% black wash plus the
    // white sheen over the gradient average.
    const face = '#79b54b';
    expect(measuredContrast('#000000', face).toFixed(2)).toBe('8.52');
    expect(measuredContrast('#000000', face)).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
  });

  test('P0-2 glass on dark gradient derives white text and tint (white vs #565f69 face 6.49:1)', () => {
    const appearance = resolveBiolinkButtonAppearance({
      bgConfig: {backgroundImage: DARK_GRADIENT},
      btnConfig: {variant: 'glass'},
    });
    expect(buttonVars(appearance)['--biolink-button-text']).toBe('#ffffff');
    expect(buttonVars(appearance)['--biolink-button-background']).toContain(
      'color-mix(in srgb, #ffffff 10%, transparent)',
    );
    const face = '#565f69';
    expect(measuredContrast('#ffffff', face).toFixed(2)).toBe('6.49');
    expect(measuredContrast('#ffffff', face)).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
  });

  test('P0-2 glass without a painted background falls back to theme foreground, not near-white primary', () => {
    // The old default (`--color-primary-foreground`) is near-white in the
    // light scheme — ~1.03:1 on the default whitish glass face. The theme
    // foreground token reads on the face in both schemes instead.
    const appearance = resolveBiolinkButtonAppearance({
      btnConfig: {variant: 'glass'},
    });
    expect(buttonVars(appearance)['--biolink-button-text']).toBe(
      'var(--color-foreground)',
    );
  });

  test('P0-3 solid white fill derives a black label (white vs white 1.00:1 → 21.00:1)', () => {
    const appearance = resolveBiolinkButtonAppearance({
      btnConfig: {color: '#ffffff'},
    });
    expect(buttonVars(appearance)['--biolink-button-background']).toBe(
      '#ffffff',
    );
    expect(buttonVars(appearance)['--biolink-button-text']).toBe('#000000');
    expect(measuredContrast('#000000', '#ffffff').toFixed(2)).toBe('21.00');
  });

  test('P0-3 solid black fill derives a white label (21.00:1)', () => {
    const appearance = resolveBiolinkButtonAppearance({
      btnConfig: {color: '#000000'},
    });
    expect(buttonVars(appearance)['--biolink-button-text']).toBe('#ffffff');
  });

  test('P0-3 solid set label derives its fill (black label → white fill, 21.00:1)', () => {
    const appearance = resolveBiolinkButtonAppearance({
      btnConfig: {textColor: '#000000'},
    });
    expect(buttonVars(appearance)['--biolink-button-background']).toBe(
      '#ffffff',
    );
    expect(buttonVars(appearance)['--biolink-button-text']).toBe('#000000');
  });

  test('P0-4 outline on a black card resolves a white stroke (white vs black 21.00:1)', () => {
    // White page text resolves a black card surface; the unset outline stroke
    // must read on that surface instead of a light scheme primary (2.80:1).
    const appearance = resolveBiolinkButtonAppearance({
      bgConfig: {color: '#ffffff'},
      btnConfig: {variant: 'outline'},
    });
    expect(buttonVars(appearance)['--biolink-button-border']).toBe('#ffffff');
    expect(buttonVars(appearance)['--biolink-button-text']).toBe('#ffffff');
    expect(measuredContrast('#ffffff', '#000000').toFixed(2)).toBe('21.00');
  });

  test('P0-4 outline on a dark gradient resolves a white stroke (white vs #394450 9.92:1)', () => {
    const appearance = resolveBiolinkButtonAppearance({
      bgConfig: {backgroundImage: DARK_GRADIENT},
      btnConfig: {variant: 'outline'},
    });
    expect(buttonVars(appearance)['--biolink-button-border']).toBe('#ffffff');
    expect(buttonVars(appearance)['--biolink-button-text']).toBe('#ffffff');
    const average = sampleGradientAverage(DARK_GRADIENT);
    expect(
      measuredContrast('#ffffff', average as string),
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  test('P0-5 default buttons on a light custom background resolve concrete scheme-safe colors (black fill + white label 21.00:1)', () => {
    // Theme tokens flip per OS scheme (dark primary on a light page is
    // ~1.2–1.4:1); derived concrete colors render identically everywhere.
    const appearance = resolveBiolinkButtonAppearance({
      bgConfig: {backgroundColor: '#f5f5f5'},
    });
    const style = buttonVars(appearance);
    expect(style['--biolink-button-background']).toBe('#000000');
    expect(style['--biolink-button-text']).toBe('#ffffff');
    expect(style['--biolink-button-border']).toBe('#000000');
    expect(style['--biolink-button-focus']).toBe('#000000');
    for (const key of [
      '--biolink-button-background',
      '--biolink-button-text',
      '--biolink-button-border',
      '--biolink-button-focus',
    ]) {
      expect(String(style[key])).not.toContain('var(');
    }
  });

  test('default buttons without a custom appearance keep the scheme-correct theme pair', () => {
    // Light 7.31:1 / dark 11.32:1 by theme design — no reason to derive.
    for (const appearance of [null, undefined, {}] as const) {
      const resolved = buttonVars(resolveBiolinkButtonAppearance(appearance));
      expect(resolved['--biolink-button-background']).toBe(
        'var(--color-primary)',
      );
      expect(resolved['--biolink-button-text']).toBe(
        'var(--color-primary-foreground)',
      );
    }
  });
});

describe('painted-panel accent pair', () => {
  test('a dark chosen surface lifts accent and focus to Counter Blue Light (14.76:1 text, 11.32:1 label)', () => {
    // White page text resolves a black card surface (keep-list above): Counter
    // Blue pinned at 46% lands at 2.80:1 there — failing accent text (4.5:1)
    // and the focus ring (3:1) — so both lift to the dark-mode blue.
    const variables = resolveBiolinkThemeVariables({
      bgConfig: {backgroundColor: '#111111', color: '#ffffff'},
    });
    expect(variables['--biolink-surface']).toContain('#000');
    expect(variables['--biolink-accent']).toBe('oklch(88.2% 0.059 254.128)');
    expect(variables['--biolink-focus']).toBe('oklch(88.2% 0.059 254.128)');
    expect(variables['--biolink-accent-foreground']).toBe('oklch(0.2478 0 0)');

    const accent = variables['--biolink-accent'] as string;
    expect(measuredContrast(accent, '#000000').toFixed(2)).toBe('14.76');
    expect(measuredContrast(accent, '#000000')).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
    expect(
      measuredContrast(variables['--biolink-focus'] as string, '#000000'),
    ).toBeGreaterThanOrEqual(3);
    expect(
      measuredContrast(
        variables['--biolink-accent-foreground'] as string,
        accent,
      ),
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  test('a light chosen surface pins Counter Blue literally (scheme-independent, 7.43:1 accent text on white)', () => {
    // var(--color-primary) follows the OS scheme: under a dark scheme it
    // holds the 88.2% lifted twin, which sits at 1.42:1 on this light
    // surface. The painted-panel accent must not depend on the OS scheme.
    const variables = resolveBiolinkThemeVariables({
      bgConfig: {backgroundColor: '#f5f5f5', color: '#000000'},
    });
    expect(variables['--biolink-surface']).toContain('#fff');
    expect(variables['--biolink-accent']).toBe('oklch(46% 0.214 259.815)');
    expect(variables['--biolink-accent-foreground']).toBe(
      'oklch(0.9911 0 190.05)',
    );
    expect(variables['--biolink-focus']).toBe('oklch(46% 0.214 259.815)');
    for (const key of [
      '--biolink-accent',
      '--biolink-accent-foreground',
      '--biolink-focus',
    ] as const) {
      expect(String(variables[key])).not.toContain('var(');
    }

    const accent = variables['--biolink-accent'] as string;
    expect(measuredContrast(accent, '#ffffff')).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
    expect(
      measuredContrast(variables['--biolink-focus'] as string, '#ffffff'),
    ).toBeGreaterThanOrEqual(3);
    expect(
      measuredContrast(
        variables['--biolink-accent-foreground'] as string,
        accent,
      ),
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  test('an unpainted store resolves the same theme pair consumers fall back to', () => {
    for (const appearance of [null, undefined, {}] as const) {
      const variables = resolveBiolinkThemeVariables(appearance);
      expect(variables['--biolink-accent']).toBe('var(--color-primary)');
      expect(variables['--biolink-accent-foreground']).toBe(
        'var(--color-primary-foreground)',
      );
      expect(variables['--biolink-focus']).toBe('var(--be-primary)');
    }
  });
});

describe('gradient preset contrast data', () => {
  test('P1-1 every shipped preset text color passes on its own stops', () => {
    for (const entry of GradientBackgrounds) {
      if (!entry.color || !entry.backgroundImage) continue;
      const stops = entry.backgroundImage.match(
        /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi,
      );
      expect(stops?.length).toBeGreaterThan(0);
      for (const stop of stops as string[]) {
        expect(
          measuredContrast(entry.color, stop),
          `${entry.backgroundImage} text ${entry.color} on ${stop}`,
        ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      }
    }
  });

  test('P1-1 green #56ab2f→#a8e063 and mauve #b79891→#94716b ship no failing white (derive black)', () => {
    const green = GradientBackgrounds.find(entry =>
      entry.backgroundImage?.includes('#56ab2f'),
    );
    const mauve = GradientBackgrounds.find(entry =>
      entry.backgroundImage?.includes('#b79891'),
    );
    expect(green).toBeDefined();
    expect(mauve).toBeDefined();
    expect(green?.color).toBeUndefined();
    expect(mauve?.color).toBeUndefined();
    expect(deriveGradientTextColor(green?.backgroundImage)).toBe('#000000');
    expect(deriveGradientTextColor(mauve?.backgroundImage)).toBe('#000000');
  });

  test('gradient sampler ignores image backgrounds and unparseable input', () => {
    expect(
      sampleGradientAverage('url(https://example.com/bg.webp)'),
    ).toBeNull();
    expect(sampleGradientAverage(undefined)).toBeNull();
    expect(sampleGradientAverage('definitely-not-a-gradient')).toBeNull();
  });
});

describe('storefront contrast wiring', () => {
  test('P1-6 branding lockups are image-only (wordmark carries the name)', () => {
    // Round-2 wiring decision: the logo slots render the full wordmark and
    // no site_name text span sits next to the image (the name is in the
    // wordmark). The lockup must still expose an accessible name.
    for (const file of ['biolink-layout.tsx', 'creator-profile-layout.tsx']) {
      const source = fs.readFileSync(
        path.resolve(
          'resources/client/short-links/renderers/biolink-renderer',
          file,
        ),
        'utf8',
      );
      expect(source).not.toContain('>{branding.site_name}</span>');
      expect(source).not.toContain('{site_name}</span>');
      // accessible name survives: profile keeps its aria-label, both keep
      // the img alt (:site logo).
      expect(source).toContain(':site logo');
    }
  });

  test('gradient picks derive the foreground when the preset ships none', () => {
    const source = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/background-selector/gradients/gradient-background-tab.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('deriveGradientTextColor');
    expect(source).toMatch(
      /color:\s*gradient\.color\s*\?\?\s*deriveGradientTextColor/,
    );
  });

  test('button editor cross-validates the button color pair without blocking save', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/stores/store-editor/appearance/button-style.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('measureContrastRatio');
    expect(source).toContain('MIN_TEXT_CONTRAST');
    expect(source).toContain('text-warning');
  });
});
