import {Trans} from '@ui/i18n/trans';

// The radius steps an admin can pick for a theme. Mirrors the
// `.radius-none|sm|lg` utilities in common-tailwind.css: `default` means "no
// remap" (the standard three-radius system), `none` is the Square exception
// and `sm` is the retuned "Round" step. Keep this list in step with the CSS —
// radius-tokens.test.ts guards that fields stay tighter than buttons for every
// step offered here.
export const roundnessOptions = [
  {
    value: 'none',
    label: (
      <>
        <RoundnessPreview d="M4 20V4H20" />
        <Trans message="Square" />
      </>
    ),
  },
  {
    value: 'sm',
    label: (
      <>
        <RoundnessPreview d="M4 20V8C4 5.79086 5.79086 4 8 4H20" />
        <Trans message="Round" />
      </>
    ),
  },
  {
    value: 'default',
    label: (
      <>
        <RoundnessPreview d="M4 20V12C4 7.58172 7.58172 4 12 4H20" />
        <Trans message="Default" />
      </>
    ),
  },
] as const;

export function RoundnessPreview({d}: {d: string}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const themeColorList = [
  {
    label: <Trans message="Background" />,
    key: '--be-background',
  },
  {
    label: <Trans message="Background muted" />,
    key: '--be-muted',
  },
  {
    label: <Trans message="Card" />,
    key: '--be-card',
  },
  {
    label: <Trans message="Foreground" />,
    key: '--be-foreground',
  },
  {
    label: <Trans message="Primary" />,
    key: '--be-primary',
  },
  {
    label: <Trans message="Primary foreground" />,
    key: '--be-primary-foreground',
  },
  {
    label: <Trans message="Secondary" />,
    key: '--be-secondary',
  },
  {
    label: <Trans message="Secondary foreground" />,
    key: '--be-secondary-foreground',
  },
  {
    label: <Trans message="Accent" />,
    key: '--be-accent',
  },
  {
    label: <Trans message="Accent foreground" />,
    key: '--be-accent-foreground',
  },
  {
    label: <Trans message="Border" />,
    key: '--be-border',
  },
  {
    label: <Trans message="Input" />,
    key: '--be-input',
  },
];
