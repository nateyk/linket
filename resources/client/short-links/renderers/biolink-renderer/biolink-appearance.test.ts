import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {BiolinkAppearanceConfigBtnConfig} from '@app/gen/schemas/biolink-appearance-config-btn-config';
import {
  BiolinkContainerRadius,
  resolveBiolinkContainerRadius,
  resolveBiolinkRadiusVariables,
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
        '--be-radius-card': '16px',
        '--be-radius-card-sm': '16px',
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
      'rounded-sm': {value: '16px', avatarValue: '16px'},
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
    expect(source).toContain(
      '<Avatar.ColorFallback className={containerRadius.avatarClassName}>',
    );
    expect(source).toMatch(
      /function AboutSection[\s\S]*?containerRadius\.className/,
    );
    expect(source).not.toContain('rounded-card-sm');
    expect(source).not.toContain('buttonAppearance.radius');
  });

  test('keeps the card flat: depth comes from the ring alone', () => {
    const shell = source.match(
      /'gap-0 py-0 bg-\[var\(--biolink-surface\)\][^']*'/,
    )?.[0];
    expect(shell).toContain('ring-1');
    expect(shell).not.toMatch(/shadow/);

    // The shell is a Card, so the card primitive has to be flat too.
    const cardPrimitive = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/shadcn/card/card.tsx',
      ),
      'utf8',
    );
    const cardRoot = cardPrimitive.match(/'group\/card[^']*'/)?.[0];
    expect(cardRoot).toBeTruthy();
    expect(cardRoot).not.toMatch(/shadow/);
  });

  test('frames the avatar at the size the editor previews', () => {
    expect(source).toContain('-mt-10 aspect-square size-22');
    expect(source).toContain('p-1 after:hidden');
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

describe('creator profile editor wiring', () => {
  const source = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/stores/store-editor/creator-profile-editor.tsx',
    ),
    'utf8',
  );

  test('previews the cover and the avatar with the radius they render at', () => {
    expect(source).toContain('cropRadius={containerRadius.value}');
    expect(source).toContain('cropRadius={containerRadius.avatarValue}');
    expect(source).toContain(
      'previewClassName={containerRadius.avatarClassName}',
    );
    expect(source).toContain('size-22 bg-background p-1');
  });

  test('crops the cover at the same 3:1 box the card renders', () => {
    expect(source).toContain('aspect={3}');
    expect(source).toMatch(/'h-28 w-full max-w-\[22\.5rem\] sm:h-30'/);
  });
});
