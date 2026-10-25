import {useLogout} from '@common/auth/requests/use-logout';
import {auth} from '@common/auth/use-auth';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Sidebar} from '@common/ui/dashboard/sidebar';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {Avatar} from '@shadcn/avatar/avatar';
import {Trans} from '@ui/i18n/trans';
import {
  DownloadIcon,
  GraduationCapIcon,
  HeadphonesIcon,
  LayoutGridIcon,
  LifeBuoyIcon,
  LogInIcon,
  LogOutIcon,
  MailIcon,
  ReceiptIcon,
  SettingsIcon,
  UserPlusIcon,
} from 'lucide-react';
import {
  Fragment,
  use,
  type ReactElement,
  type ReactNode,
  type SVGProps,
} from 'react';
import {Link, useLocation} from 'react-router';
import type {PortalSection} from './portal-section';

/** @deprecated Use PortalSection — kept for older imports. */
export type PortalNavSection = PortalSection;

export type PortalNavCounts = {
  courses?: number;
  downloads?: number;
  audio?: number;
};

type LibraryNavItem = {
  section: PortalSection;
  label: string;
  icon: ReactElement<SVGProps<SVGSVGElement>>;
  count?: number;
};

/**
 * Buyer-library sidebar. Uses the same Sidebar primitives as Account Settings
 * for chrome only — does not import or share account-settings modules/routes.
 */
export function PortalSidebar({
  mode,
  email,
  activeSection,
  onSectionChange,
  counts,
}: {
  mode: 'auth' | 'guest';
  email?: string;
  activeSection: PortalSection;
  onSectionChange: (section: PortalSection) => void;
  counts?: PortalNavCounts;
}) {
  const {isMobileMode} = use(DashboardLayoutContext);
  const {pathname} = useLocation();
  const ticketsActive = pathname.startsWith('/my-portal/tickets');
  const logout = useLogout();
  const user = auth.user;
  const displayEmail = email || user?.email || undefined;
  const displayName = user?.name || displayEmail?.split('@')[0] || 'Guest';
  const avatarUrl = user?.image ?? null;
  const registerHref = displayEmail
    ? `/register?email=${encodeURIComponent(displayEmail)}`
    : '/register';

  const libraryItems: LibraryNavItem[] = [
    {
      section: 'overview',
      label: 'Overview',
      icon: <LayoutGridIcon aria-hidden />,
    },
    {
      section: 'courses',
      label: 'My courses',
      count: counts?.courses,
      icon: <GraduationCapIcon aria-hidden />,
    },
    {
      section: 'downloads',
      label: 'Downloads',
      count: counts?.downloads,
      icon: <DownloadIcon aria-hidden />,
    },
    {
      section: 'audio',
      label: 'Audio library',
      count: counts?.audio,
      icon: <HeadphonesIcon aria-hidden />,
    },
    {
      section: 'orders',
      label: 'Orders',
      icon: <ReceiptIcon aria-hidden />,
    },
  ];

  return (
    <Sidebar.Root
      collapsible="icon"
      width="w-54"
      className="data-[variant=floating]:bg-background/60 dark:data-[variant=floating]:bg-card/60"
    >
      <Sidebar.Header>
        {isMobileMode ? (
          <Sidebar.Item>
            <Logo color="auto" className="max-w-40" />
          </Sidebar.Item>
        ) : null}
        <div className="flex flex-col items-center gap-2 px-2 py-3 group-data-[collapsible=icon]:hidden">
          <Avatar.Root className="size-14">
            {avatarUrl ? (
              <Avatar.Image src={avatarUrl} alt={displayName} />
            ) : null}
            <Avatar.ColorFallback className="text-base font-semibold">
              {displayName}
            </Avatar.ColorFallback>
          </Avatar.Root>
          <div className="w-full min-w-0 text-center">
            <p className="truncate text-sm font-medium" title={displayName}>
              {displayName}
            </p>
            {displayEmail ? (
              <p
                className="truncate text-xs text-muted-foreground"
                title={displayEmail}
              >
                {displayEmail}
              </p>
            ) : null}
          </div>
        </div>
      </Sidebar.Header>

      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.GroupLabel>
            <Trans message="Library" />
          </Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {libraryItems.map(item => (
                <Fragment key={item.section}>
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton
                      icon={item.icon}
                      aria-current={
                        !ticketsActive && activeSection === item.section
                          ? 'page'
                          : undefined
                      }
                      rightIcon={
                        item.count != null ? (
                          <Sidebar.MenuBadge>{item.count}</Sidebar.MenuBadge>
                        ) : undefined
                      }
                      onClick={() => onSectionChange(item.section)}
                    >
                      <Trans message={item.label} />
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                  {item.section === 'downloads' ? (
                    <Sidebar.MenuItem>
                      <Sidebar.MenuButton
                        render={<Link to="/my-portal/tickets" />}
                        icon={<LifeBuoyIcon aria-hidden />}
                        aria-current={ticketsActive ? 'page' : undefined}
                      >
                        <Trans message="Tickets" />
                      </Sidebar.MenuButton>
                    </Sidebar.MenuItem>
                  ) : null}
                </Fragment>
              ))}
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>

        <Sidebar.Group>
          <Sidebar.GroupLabel>
            <Trans message="Account" />
          </Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  icon={<SettingsIcon aria-hidden />}
                  aria-current={
                    activeSection === 'settings' ? 'page' : undefined
                  }
                  onClick={() => onSectionChange('settings')}
                >
                  <Trans message="Account settings" />
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
              {mode === 'auth' ? (
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton
                    icon={<LogOutIcon aria-hidden />}
                    onClick={() => logout.mutate()}
                  >
                    <Trans message="Log out" />
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              ) : (
                <>
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton
                      render={<Link to={registerHref} />}
                      icon={<UserPlusIcon aria-hidden />}
                    >
                      <Trans message="Create account" />
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton
                      render={<Link to="/login" />}
                      icon={<LogInIcon aria-hidden />}
                    >
                      <Trans message="Login" />
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton
                      render={
                        <Link to="/my-portal" state={{forceRecovery: true}} />
                      }
                      icon={<MailIcon aria-hidden />}
                    >
                      <Trans message="Switch email" />
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                </>
              )}
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>
      </Sidebar.Content>
    </Sidebar.Root>
  );
}

/** @deprecated Use PortalSidebar + PortalSectionLayout inside PortalLibraryLayout. */
export function PortalAccountLayout({
  mode,
  email,
  activeSection,
  onSectionChange,
  counts,
  children,
}: {
  mode: 'auth' | 'guest';
  email?: string;
  activeSection: PortalSection;
  onSectionChange: (section: PortalSection) => void;
  counts?: PortalNavCounts;
  children: ReactNode;
}) {
  return (
    <>
      <PortalSidebar
        mode={mode}
        email={email}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        counts={counts}
      />
      {children}
    </>
  );
}
