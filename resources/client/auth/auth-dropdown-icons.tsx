import {LayoutDashboardIcon, SettingsIcon, UserPenIcon} from 'lucide-react';
import {ComponentProps, ReactElement} from 'react';

export const authDropdownIcons: Record<
  string,
  ReactElement<ComponentProps<'svg'>>
> = {
  '/admin/insights': <SettingsIcon />,
  '/account-settings': <UserPenIcon />,
  '/dashboard': <LayoutDashboardIcon />,
};
