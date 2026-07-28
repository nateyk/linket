import {Trans} from '@ui/i18n/trans';

export const BillingPeriodPresets = [
  {
    key: 'day1',
    label: <Trans message="Daily" />,
    interval: 'day',
    interval_count: 1,
  },
  {
    key: 'week1',
    label: <Trans message="Weekly" />,
    interval: 'week',
    interval_count: 1,
  },
  {
    key: 'month1',
    label: <Trans message="Monthly" />,
    interval: 'month',
    interval_count: 1,
  },
  {
    key: 'month3',
    label: <Trans message="Every 3 months" />,
    interval: 'month',
    interval_count: 3,
  },
  {
    key: 'month6',
    label: <Trans message="Every 6 months" />,
    interval: 'month',
    interval_count: 6,
  },
  {
    key: 'year1',
    label: <Trans message="Yearly" />,
    interval: 'year',
    interval_count: 1,
  },
  {
    key: 'custom',
    label: <Trans message="Custom" />,
    interval: null,
    interval_count: null,
  },
];
