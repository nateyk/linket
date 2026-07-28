import {useAdminSettingsPageNavConfig} from '@common/admin/settings/use-admin-settings-page-nav-config';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Trans} from '@ui/i18n/trans';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';
import clsx from 'clsx';
import {NavLink, Outlet, useLocation} from 'react-router';
import {Fragment} from 'react/jsx-runtime';
import {StaticPageTitle} from '../../seo/static-page-title';

export function Component() {
  const isMobile = useIsMobileMediaQuery();

  return (
    <Fragment>
      <StaticPageTitle>
        <Trans message="Settings" />
      </StaticPageTitle>
      {!isMobile && <DesktopNav />}
      <Outlet />
    </Fragment>
  );
}

function DesktopNav() {
  const {pathname} = useLocation();
  const navConfig = useAdminSettingsPageNavConfig();
  return (
    <DashboardLayout.Section className="w-64">
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Settings" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <div className="compact-scrollbar flex-auto overflow-y-auto p-3 md:py-6">
        {navConfig.map(item => (
          <NavLink
            key={item.to as string}
            to={item.to}
            state={{prevPath: pathname}}
            className={({isActive}) =>
              clsx(
                'mb-2 block rounded-card px-3 py-2 text-sm whitespace-nowrap transition-bg-color',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent',
              )
            }
          >
            <Trans {...item.label} />
          </NavLink>
        ))}
      </div>
    </DashboardLayout.Section>
  );
}
