<?php

use Common\Settings\Themes\CssTheme;
use Illuminate\Database\Migrations\Migration;
use OzdemirBurak\Iris\Color\Oklch;
use OzdemirBurak\Iris\Color\Rgb;
use OzdemirBurak\Iris\Color\Hex;

return new class extends Migration {
    public function up(): void
    {
        $themes = CssTheme::all();

        foreach ($themes as $theme) {
            $foreground = $this->getForegroundValue($theme);

            $theme->values = [
                '--be-background' => $this->transformOldValue(
                    $theme,
                    '--be-background',
                    $theme->is_dark
                        ? [
                            '--be-bg-muted',
                            '--be-background-muted',
                            '--be-bg-weaker',
                        ]
                        : ['--be-bg', '--be-background'],
                ),
                '--be-foreground' => $foreground,

                '--be-card' => $this->transformOldValue($theme, '--be-card', [
                    '--be-elevated',
                    '--be-bg-elevated',
                    '--be-background-elevated',
                    '--be-bg',
                    '--be-background',
                ]),
                '--be-card-foreground' => $foreground,

                '--be-popover' => $this->transformOldValue(
                    $theme,
                    '--be-popover',
                    [
                        '--be-popover',
                        '--be-elevated',
                        '--be-bg-elevated',
                        '--be-background-elevated',
                        '--be-card',
                    ],
                ),
                '--be-popover-foreground' => $foreground,

                '--be-primary' => $this->transformOldValue(
                    $theme,
                    '--be-primary',
                    [],
                ),
                '--be-primary-foreground' => $this->transformOldValue(
                    $theme,
                    '--be-primary-foreground',
                    ['--be-on-primary'],
                ),

                '--be-secondary' => $this->transformOldValue(
                    $theme,
                    '--be-secondary',
                    [
                        '--be-background-chip',
                        '--be-bg-chip',
                        '--be-neutral-container',
                    ],
                ),
                '--be-secondary-foreground' => $foreground,

                '--be-muted' => $this->transformOldValue(
                    $theme,
                    '--be-muted',
                    $theme->is_dark
                        ? [
                            '--be-background-alt',
                            '--be-bg-alt',
                            '--be-neutral-container-weak',
                        ]
                        : [
                            '--be-background-alt',
                            '--be-bg-alt',
                            '--be-bg-weaker',
                        ],
                ),
                '--be-muted-foreground' => $this->getMutedForegroundValue(
                    $theme,
                    '--be-muted-foreground',
                    ['--be-text-weak'],
                ),

                '--be-accent' => $this->transformOldValue(
                    $theme,
                    '--be-accent',
                    [],
                ),
                '--be-accent-foreground' => $foreground,

                '--be-destructive' => $this->transformOldValue(
                    $theme,
                    '--be-destructive',
                    [],
                ),

                '--be-border' => $this->transformOldValue(
                    $theme,
                    '--be-border',
                    ['--be-divider'],
                ),
                '--be-input' => $this->transformOldValue($theme, '--be-input', [
                    '--be-divider',
                ]),

                '--be-radius' => $this->transformOldValue(
                    $theme,
                    '--be-radius',
                    [],
                ),
                '--be-button-radius' => $this->transformOldValue(
                    $theme,
                    '--be-button-radius',
                    [],
                ),
                '--be-input-radius' => $this->transformOldValue(
                    $theme,
                    '--be-input-radius',
                    [],
                ),
                '--be-panel-radius' => $this->transformOldValue(
                    $theme,
                    '--be-panel-radius',
                    [],
                ),

                '--be-sidebar' => $this->transformOldValue(
                    $theme,
                    '--be-sidebar',
                    ['--be-bg-weaker', '--be-bg-alt', '--be-background-alt'],
                ),
                '--be-sidebar-foreground' => $foreground,
                '--be-sidebar-primary' => $this->transformOldValue(
                    $theme,
                    '--be-sidebar-primary',
                    ['be-primary'],
                ),
                '--be-sidebar-primary-foreground' => $this->transformOldValue(
                    $theme,
                    '--be-sidebar-primary-foreground',
                    ['--be-on-primary'],
                ),
                '--be-sidebar-accent' => $this->transformOldValue(
                    $theme,
                    '--be-sidebar-accent',
                    [],
                ),
                '--be-sidebar-accent-foreground' => $foreground,
                '--be-sidebar-border' => $this->transformOldValue(
                    $theme,
                    '--be-sidebar-border',
                    [],
                ),
                '--be-sidebar-ring' => $this->transformOldValue(
                    $theme,
                    '--be-sidebar-ring',
                    [],
                ),
            ];

            $theme->save();
        }
    }

    protected function getForegroundValue(CssTheme $theme)
    {
        $scheme = $theme->is_dark ? 'dark' : 'light';
        $oldKeys = ['--be-fg-base', '--be-foreground-base', '--be-fg'];
        $oldFg = $this->getOldValue($theme, $oldKeys);

        if ($oldFg && $scheme === 'light') {
            $oklch = $this->transformOldValue(
                $theme,
                '--be-foreground',
                $oldKeys,
            );
            return (string) (new Oklch($oklch))->lighten(13);
        }

        return config("themes.$scheme.--be-foreground");
    }

    protected function getMutedForegroundValue(CssTheme $theme)
    {
        $scheme = $theme->is_dark ? 'dark' : 'light';

        if (isset($theme->values['--be-muted-foreground'])) {
            return $theme->values['--be-muted-foreground'];
        }

        if (isset($theme->values['--be-text-weak'])) {
            return $theme->values['--be-text-weak'];
        }

        $oldFg =
            $theme->values['--be-fg-base'] ??
            ($theme->values['--be-foreground-base'] ?? null);
        if ($oldFg) {
            $oklch = $this->transformOldValue($theme, '--be-foreground', [
                '--be-fg-base',
                '--be-foreground-base',
            ]);
            return (string) (new Oklch($oklch))->lighten(
                $theme->is_dark ? 30 : 40,
            );
        }

        return config("themes.$scheme.--be-muted-foreground");
    }

    protected function transformOldValue(
        CssTheme $theme,
        string $newKey,
        array $possibleKeys,
    ) {
        $scheme = $theme->is_dark ? 'dark' : 'light';
        $oldValue = $this->getOldValue($theme, [...$possibleKeys, $newKey]);

        if ($oldValue) {
            $convertedValue = $this->maybeConvertPartialRgbToOklch($oldValue);
            return $convertedValue ?: $oldValue;
        } else {
            return config("themes.$scheme.$newKey");
        }
    }

    protected function getOldValue(CssTheme $theme, array $possibleKeys)
    {
        foreach ($possibleKeys as $key) {
            if ($theme->values[$key] ?? null) {
                return $theme->values[$key];
            }
        }
    }

    protected function maybeConvertPartialRgbToOklch(string $value)
    {
        if (!is_string($value) || str_ends_with($value, 'rem')) {
            return $value;
        }

        if (str_starts_with($value, 'oklch')) {
            return $value;
        }

        if (str_starts_with($value, '#')) {
            return (string) (new Hex($value))->toOklch();
        }

        if (
            !is_string($value) ||
            !preg_match(
                '/^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*$/',
                $value,
                $matches,
            )
        ) {
            return $value;
        }

        $red = (int) $matches[1];
        $green = (int) $matches[2];
        $blue = (int) $matches[3];

        if ($red > 255 || $green > 255 || $blue > 255) {
            return $value;
        }

        return (string) (new Rgb("$red,$green,$blue"))->toOklch();
    }
};
