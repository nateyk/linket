import {useLogout} from '@common/auth/requests/use-logout';
import {auth} from '@common/auth/use-auth';
import {Avatar} from '@shadcn/avatar/avatar';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@shadcn/sheet/sheet';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {
  DownloadIcon,
  LogInIcon,
  LogOutIcon,
  MailIcon,
  MenuIcon,
  NotepadTextIcon,
  SettingsIcon,
  UserPlusIcon,
} from 'lucide-react';
import type {ReactNode} from 'react';
import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';

export type PortalNavSection = 'courses' | 'downloads';

type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  section?: PortalNavSection;
  onClick?: () => void;
  state?: {forceRecovery?: boolean};
};

function scrollToSection(section: PortalNavSection) {
  document
    .getElementById(`portal-${section}`)
    ?.scrollIntoView({behavior: 'smooth', block: 'start'});
}

function PortalNavLink({
  item,
  active,
  onNavigate,
  onSectionChange,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  onSectionChange?: (section: PortalNavSection) => void;
}) {
  const className = cn(
    'mb-0 flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors sm:px-4 sm:py-2.5',
    active
      ? 'bg-accent text-accent-foreground'
      : 'text-card-foreground hover:bg-muted',
  );

  if (item.section) {
    return (
      <a
        href={`#portal-${item.section}`}
        className={className}
        onClick={event => {
          event.preventDefault();
          onSectionChange?.(item.section!);
          scrollToSection(item.section!);
          onNavigate?.();
        }}
      >
        {item.icon}
        <Trans message={item.label} />
      </a>
    );
  }

  if (item.onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          item.onClick?.();
          onNavigate?.();
        }}
      >
        {item.icon}
        <Trans message={item.label} />
      </button>
    );
  }

  return (
    <Link
      to={item.href ?? '#'}
      state={item.state}
      className={className}
      onClick={() => onNavigate?.()}
    >
      {item.icon}
      <Trans message={item.label} />
    </Link>
  );
}

function PortalSidebarCard({
  activeSection,
  email,
  displayName,
  avatarUrl,
  mode,
  registerHref,
  onNavigate,
  onSectionChange,
}: {
  activeSection: PortalNavSection;
  email?: string;
  displayName?: string;
  avatarUrl?: string | null;
  mode: 'auth' | 'guest';
  registerHref: string;
  onNavigate?: () => void;
  onSectionChange?: (section: PortalNavSection) => void;
}) {
  const logout = useLogout();
  const name = displayName || email || 'Guest';

  const libraryItems: NavItem[] = [
    {
      id: 'courses',
      label: 'Purchased courses',
      section: 'courses',
      icon: <NotepadTextIcon className="size-4" aria-hidden />,
    },
    {
      id: 'downloads',
      label: 'Downloads',
      section: 'downloads',
      icon: <DownloadIcon className="size-4" aria-hidden />,
    },
  ];

  const accountItems: NavItem[] =
    mode === 'auth'
      ? [
          {
            id: 'account',
            label: 'Account settings',
            href: '/account-settings',
            icon: <SettingsIcon className="size-4" aria-hidden />,
          },
          {
            id: 'logout',
            label: 'Logout',
            icon: <LogOutIcon className="size-4" aria-hidden />,
            onClick: () => logout.mutate(),
          },
        ]
      : [
          {
            id: 'register',
            label: 'Create account',
            href: registerHref,
            icon: <UserPlusIcon className="size-4" aria-hidden />,
          },
          {
            id: 'login',
            label: 'Login',
            href: '/login',
            icon: <LogInIcon className="size-4" aria-hidden />,
          },
          {
            id: 'switch',
            label: 'Switch email',
            href: '/my-portal',
            state: {forceRecovery: true},
            icon: <MailIcon className="size-4" aria-hidden />,
          },
        ];

  return (
    <Card.Root className="gap-0 overflow-hidden bg-background py-0">
      <div className="flex min-w-0 flex-col items-center border-b px-4 py-3 text-center">
        <Avatar.Root className="mt-3 size-12 rounded-lg after:rounded-lg">
          {avatarUrl ? (
            <Avatar.Image
              src={avatarUrl}
              alt={name}
              className="rounded-lg object-cover"
            />
          ) : null}
          <Avatar.ColorFallback className="rounded-lg text-sm font-semibold">
            {name}
          </Avatar.ColorFallback>
        </Avatar.Root>
        <p className="mt-3 w-full truncate text-base font-medium" title={name}>
          {name}
        </p>
        {email ? (
          <p
            className="w-full truncate text-sm text-muted-foreground"
            title={email}
          >
            {email}
          </p>
        ) : null}
      </div>

      <nav aria-label="Portal navigation">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4">
          {libraryItems.map(item => (
            <PortalNavLink
              key={item.id}
              item={item}
              active={item.section === activeSection}
              onNavigate={onNavigate}
              onSectionChange={onSectionChange}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3 px-4 py-4">
          {accountItems.map(item => (
            <PortalNavLink
              key={item.id}
              item={item}
              active={false}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>
    </Card.Root>
  );
}

export function PortalAccountLayout({
  mode,
  email,
  activeSection,
  onSectionChange,
  children,
}: {
  mode: 'auth' | 'guest';
  email?: string;
  activeSection: PortalNavSection;
  onSectionChange: (section: PortalNavSection) => void;
  children: ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const user = auth.user;
  const displayName = user?.name || undefined;
  const avatarUrl = user?.image ?? null;
  const registerHref = email
    ? `/register?email=${encodeURIComponent(email)}`
    : '/register';

  useEffect(() => {
    const root = mainRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target.id) {
          return;
        }
        if (visible.target.id === 'portal-courses') {
          onSectionChange('courses');
        } else if (visible.target.id === 'portal-downloads') {
          onSectionChange('downloads');
        }
      },
      {rootMargin: '-20% 0px -55% 0px', threshold: [0.15, 0.4]},
    );

    const courses = root.querySelector('#portal-courses');
    const downloads = root.querySelector('#portal-downloads');
    if (courses) {
      observer.observe(courses);
    }
    if (downloads) {
      observer.observe(downloads);
    }

    return () => observer.disconnect();
  }, [onSectionChange]);

  const sidebarProps = {
    activeSection,
    email: email || user?.email || undefined,
    displayName,
    avatarUrl,
    mode,
    registerHref,
    onSectionChange,
  };

  return (
    <div className="grid items-start gap-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                aria-label="Open account menu"
                className="gap-2"
              />
            }
          >
            <MenuIcon className="size-4" />
            <Trans message="Account Menu" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100%,320px)] p-4">
            <SheetHeader className="sr-only">
              <SheetTitle>
                <Trans message="Account Menu" />
              </SheetTitle>
            </SheetHeader>
            <PortalSidebarCard
              {...sidebarProps}
              onNavigate={() => setSheetOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden md:sticky md:top-24 md:block">
        <PortalSidebarCard {...sidebarProps} />
      </aside>

      <main ref={mainRef} className="min-w-0 *:scroll-mt-32">
        {children}
      </main>
    </div>
  );
}
