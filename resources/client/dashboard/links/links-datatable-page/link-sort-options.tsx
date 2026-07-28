import {Trans} from '@ui/i18n/trans';

export const linkSortOptions = [
  {
    label: <Trans message="Date created" />,
    orderBy: 'created_at',
    isDefault: true,
  },
  {
    label: <Trans message="Expiration date" />,
    orderBy: 'expires_at',
  },
  {
    label: <Trans message="Last clicked" />,
    orderBy: 'clicked_at',
  },
  {
    label: <Trans message="Clicks over time" />,
    orderBy: 'clicks_count',
  },
];
