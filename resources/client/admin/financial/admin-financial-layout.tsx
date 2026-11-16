import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Trans} from '@ui/i18n/trans';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';
import clsx from 'clsx';
import {
  ChevronDownIcon,
  CircleDollarSignIcon,
  CreditCardIcon,
} from 'lucide-react';
import {Fragment} from 'react';
import {NavLink, Outlet, useLocation, useNavigate} from 'react-router';
import {financialNavItems} from './admin-financial-nav-config';

export function Component() {
  const isMobile = useIsMobileMediaQuery();

  return (
    <Fragment>
      <StaticPageTitle>
        <Trans message="Financial" />
      </StaticPageTitle>
      {!isMobile && <FinancialDesktopNav />}
      <Outlet />
    </Fragment>
  );
}

function FinancialDesktopNav() {
  const {pathname} = useLocation();

  return (
    <DashboardLayout.Section className="w-64 shrink-0">
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Financial" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <div className="compact-scrollbar flex flex-col gap-1 overflow-y-auto p-3 md:py-5">
        <div className="mb-2 px-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <Trans message="Financial Hub" />
        </div>
        {financialNavItems.map(item => {
          const Icon = item.icon;
          const isActive =
            pathname === item.to ||
            (item.to === '/admin/financial/general' &&
              (pathname === '/admin/financial' || pathname === '/admin/financial/')) ||
            (item.to === '/admin/financial/withdrawal-methods' &&
              pathname.startsWith('/admin/financial/withdrawal-methods') &&
              !pathname.includes('/legacy')) ||
            (item.to === '/admin/financial/withdrawal-methods/legacy' &&
              pathname.includes('/legacy')) ||
            (item.to === '/admin/financial/withdrawals' &&
              (pathname.startsWith('/admin/financial/withdrawals') ||
                pathname.startsWith('/admin/withdrawals'))) ||
            (item.to === '/admin/financial/payment-activity' &&
              (pathname.startsWith('/admin/financial/payment-activity') ||
                pathname.startsWith('/admin/payment-activity')));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={clsx(
                'group flex items-start gap-2.5 rounded-card px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent font-medium text-accent-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )}
            >
              <Icon
                className={clsx(
                  'mt-0.5 size-4 shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate">
                  <Trans {...item.label} />
                </div>
                {item.description && (
                  <div className="truncate text-xs text-muted-foreground">
                    <Trans {...item.description} />
                  </div>
                )}
              </div>
            </NavLink>
          );
        })}
      </div>
    </DashboardLayout.Section>
  );
}

export function FinancialMobileNav() {
  const {pathname} = useLocation();
  const navigate = useNavigate();

  const activeItem =
    financialNavItems.find(
      item =>
        pathname === item.to ||
        (item.to === '/admin/financial/general' &&
          (pathname === '/admin/financial' || pathname === '/admin/financial/')) ||
        (item.to === '/admin/financial/withdrawal-methods' &&
          pathname.startsWith('/admin/financial/withdrawal-methods') &&
          !pathname.includes('/legacy')) ||
        (item.to === '/admin/financial/withdrawal-methods/legacy' &&
          pathname.includes('/legacy')) ||
        (item.to === '/admin/financial/withdrawals' &&
          (pathname.startsWith('/admin/financial/withdrawals') ||
            pathname.startsWith('/admin/withdrawals'))) ||
        (item.to === '/admin/financial/payment-activity' &&
          (pathname.startsWith('/admin/financial/payment-activity') ||
            pathname.startsWith('/admin/payment-activity'))),
    ) || financialNavItems[0];

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        render={<Button variant="outline" size="sm" className="gap-1.5 md:hidden" />}
      >
        <activeItem.icon className="size-4 shrink-0" />
        <span className="max-w-36 truncate">
          <Trans {...activeItem.label} />
        </span>
        <ChevronDownIcon className="size-3 text-muted-foreground" />
      </Dropdown.Trigger>
      <Dropdown.Content align="start" className="w-64">
        {financialNavItems.map(item => {
          const Icon = item.icon;
          return (
            <Dropdown.Item
              key={item.to}
              onClick={() => navigate(item.to)}
              className="gap-2.5 py-2"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">
                  <Trans {...item.label} />
                </span>
                {item.description && (
                  <span className="text-xs text-muted-foreground">
                    <Trans {...item.description} />
                  </span>
                )}
              </div>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
