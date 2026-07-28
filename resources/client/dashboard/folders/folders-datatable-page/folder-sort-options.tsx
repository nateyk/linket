import {Trans} from '@ui/i18n/trans';

export const folderSortOptions = [
  {
    label: <Trans message="Date created" />,
    orderBy: 'created_at',
    isDefault: true,
  },
  {
    label: <Trans message="Last updated" />,
    orderBy: 'updated_at',
  },
  {
    label: <Trans message="Name" />,
    orderBy: 'name',
  },
  {
    label: <Trans message="Links count" />,
    orderBy: 'links_count',
  },
];
