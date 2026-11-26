'use client';

import {useAuth} from '@common/auth/use-auth';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {NavbarAuthUser} from '@common/ui/navigation/navbar/navbar-auth-user';
import {NavbarColorSchemeToggle} from '@common/ui/navigation/navbar/navbar-color-scheme-toggle';
import {Accordion} from '@shadcn/accordion/accordion';
import {Button, LinkButton} from '@shadcn/button/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@shadcn/navigation-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@shadcn/sheet/sheet';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import {
  LayoutDashboardIcon,
  MenuIcon,
  MessageSquareIcon,
  TagIcon,
  XIcon,
} from 'lucide-react';
import {type MouseEvent, useEffect, useMemo, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router';
import {
  buildHeaderNavItems,
  type HeaderSectionInput,
} from './linket-nav-links';
import {MegaMenu} from './mega-menu';

type HeaderProps = {
  sections?: HeaderSectionInput[];
  anchors?: (string | undefined)[];
};

function resolveHashId(href: string): string | null {
  if (href.startsWith('#')) return href.slice(1);
  if (href.startsWith('/#')) return href.slice(2);
  return null;
}

export function Header({sections = [], anchors = []}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {isLoggedIn, getRedirectUri} = useAuth();
  const {branding, registration} = useSettings();
  const {trans} = useTrans();
  const location = useLocation();
  const navigate = useNavigate();

  const navGroups = useMemo(
    () => buildHeaderNavItems(sections, anchors),
    [sections, anchors],
  );

  // Section links from other routes ("/pricing", "/contact", "/blog") land on
  // "/#…". The browser's fragment scroll races React's render of the landing
  // sections and the router's scroll restoration — keep aiming until settled.
  useEffect(() => {
    if (window.location.pathname !== '/' || !window.location.hash) return;
    const id = window.location.hash.slice(1);
    if (!id) return;

    let stopped = false;
    let attempts = 0;
    let settledFrames = 0;
    const userGaveInput = () => {
      stopped = true;
    };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(type =>
      window.addEventListener(type, userGaveInput, {passive: true}),
    );

    const scrollToTarget = () => {
      if (stopped) return;
      const target = document.getElementById(id);
      if (target) {
        const wanted = target.getBoundingClientRect().top + window.scrollY;
        if (Math.abs(window.scrollY - wanted) > 8) {
          target.scrollIntoView({block: 'start'});
          settledFrames = 0;
        } else if (++settledFrames > 45) {
          return;
        }
      }
      if (++attempts < 600) requestAnimationFrame(scrollToTarget);
    };
    scrollToTarget();

    return () => {
      stopped = true;
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(type =>
        window.removeEventListener(type, userGaveInput),
      );
    };
  }, []);

  const navigateToAnchor = (
    href: string,
    e?: MouseEvent<HTMLAnchorElement>,
  ) => {
    const hashId = resolveHashId(href);
    if (!hashId) return;

    const target = document.getElementById(hashId);
    if (location.pathname === '/' && target) {
      e?.preventDefault();
      target.scrollIntoView({behavior: 'smooth', block: 'start'});
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      return;
    }

    if (location.pathname !== '/') {
      e?.preventDefault();
      navigate(`/#${hashId}`);
    }
  };

  const isRouteActive = (href?: string) => {
    if (!href) return false;
    return (
      location.pathname === href ||
      (href !== '/' && location.pathname.startsWith(`${href}/`))
    );
  };

  const dashboardPath = getRedirectUri();
  const registrationDisabled = Boolean(registration?.disable);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Brand + Desktop Navigation */}
        <div className="flex items-center gap-6">
          <Logo className="h-8" url="/" />

          <NavigationMenu
            aria-label={trans({message: 'Main navigation'})}
            className="hidden lg:flex"
          >
            <NavigationMenuList>
              {navGroups.map(group => {
                if (group.items?.length) {
                  return (
                    <NavigationMenuItem key={group.id}>
                      <NavigationMenuTrigger>
                        <Trans {...group.label} />
                      </NavigationMenuTrigger>
                      <NavigationMenuContent align="start">
                        <MegaMenu
                          items={group.items}
                          columns={group.columns ?? 2}
                          ariaLabel={trans(group.label)}
                          onItemNavigate={navigateToAnchor}
                        />
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  );
                }

                if (!group.href) return null;
                const active = group.isRoute && isRouteActive(group.href);

                return (
                  <NavigationMenuItem key={group.id}>
                    {group.isRoute ? (
                      <NavigationMenuLink
                        render={<Link to={group.href} />}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          active && 'bg-accent text-foreground',
                        )}
                      >
                        <Trans {...group.label} />
                      </NavigationMenuLink>
                    ) : (
                      <NavigationMenuLink
                        href={group.href}
                        onClick={e => navigateToAnchor(group.href!, e)}
                      >
                        <Trans {...group.label} />
                      </NavigationMenuLink>
                    )}
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right: Desktop Theme + Auth Actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <NavbarColorSchemeToggle />
          {isLoggedIn ? (
            <>
              <LinkButton variant="outline" to={dashboardPath}>
                <LayoutDashboardIcon data-icon="inline-start" />
                <Trans message="Dashboard" />
              </LinkButton>
              <NavbarAuthUser variant="wide" />
            </>
          ) : (
            <>
              <LinkButton variant="ghost" to="/login">
                <Trans message="Sign in" />
              </LinkButton>
              {!registrationDisabled && (
                <LinkButton variant="default" color="primary" to="/register">
                  <Trans message="Get started" />
                </LinkButton>
              )}
            </>
          )}
        </div>

        {/* Mobile Actions & Half-Slide Drawer */}
        <div className="flex items-center gap-1 lg:hidden">
          <NavbarColorSchemeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label={trans({message: 'Open navigation menu'})}
                />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-4/5 max-w-xs flex-col gap-0 overflow-hidden p-0 sm:max-w-sm [&>button]:hidden"
            >
              <SheetHeader className="border-b border-border px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex [&>a]:flex [&>a]:min-h-11 [&>a]:items-center">
                    <Logo className="h-7" url="/" />
                  </span>
                  <SheetTitle className="sr-only">
                    {branding.site_name}
                  </SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-10"
                    onClick={() => setIsOpen(false)}
                    aria-label={trans({message: 'Close menu'})}
                  >
                    <XIcon />
                  </Button>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-3 py-4">
                <nav
                  aria-label={trans({message: 'Mobile navigation'})}
                  className="flex flex-col gap-3"
                >
                  <Accordion.Root
                    variant="separated"
                    defaultValue={['product']}
                    className="w-full"
                  >
                    {navGroups
                      .filter(group => group.items?.length)
                      .map(group => (
                        <Accordion.Item
                          key={group.id}
                          value={group.id}
                          className="border-border bg-background"
                        >
                          <Accordion.Trigger className="min-h-11 px-2 py-2.5 text-sm font-semibold hover:no-underline">
                            <Trans {...group.label} />
                          </Accordion.Trigger>
                          <Accordion.Content className="px-0 pb-1">
                            <div className="flex flex-col gap-1">
                              {group.items!.map(item => {
                                const Icon = item.icon;
                                const rowClassName =
                                  'group/item flex min-h-11 items-start gap-3 rounded-card-sm p-2 text-start no-underline transition-colors hover:bg-accent';
                                const inner = (
                                  <>
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-card-sm bg-muted text-foreground transition-colors group-hover/item:bg-primary/10 group-hover/item:text-primary">
                                      <Icon
                                        className="size-4"
                                        aria-hidden="true"
                                      />
                                    </span>
                                    <span className="flex min-w-0 flex-col gap-0.5">
                                      <span className="text-sm font-medium leading-snug text-foreground">
                                        <Trans {...item.label} />
                                      </span>
                                      {item.description ? (
                                        <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                                          <Trans {...item.description} />
                                        </span>
                                      ) : null}
                                    </span>
                                  </>
                                );

                                return item.isRoute ? (
                                  <Link
                                    key={item.id}
                                    to={item.href}
                                    className={rowClassName}
                                    onClick={() => setIsOpen(false)}
                                  >
                                    {inner}
                                  </Link>
                                ) : (
                                  <a
                                    key={item.id}
                                    href={item.href}
                                    className={rowClassName}
                                    onClick={e => {
                                      setIsOpen(false);
                                      setTimeout(
                                        () => navigateToAnchor(item.href, e),
                                        120,
                                      );
                                    }}
                                  >
                                    {inner}
                                  </a>
                                );
                              })}
                            </div>
                          </Accordion.Content>
                        </Accordion.Item>
                      ))}
                  </Accordion.Root>

                  <div className="flex flex-col gap-1.5">
                    {navGroups
                      .filter(group => !group.items?.length && group.href)
                      .map(group => {
                        const active =
                          group.isRoute && isRouteActive(group.href);
                        const RowIcon =
                          group.id === 'pricing' ? TagIcon : MessageSquareIcon;
                        const linkClassName = cn(
                          'flex min-h-11 items-center gap-3 rounded-card-sm border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground no-underline transition-colors hover:bg-accent',
                          active && 'border-primary/30 bg-accent',
                        );
                        const inner = (
                          <>
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-card-sm bg-muted text-foreground">
                              <RowIcon className="size-4" aria-hidden="true" />
                            </span>
                            <Trans {...group.label} />
                          </>
                        );

                        return group.isRoute ? (
                          <Link
                            key={group.id}
                            to={group.href!}
                            aria-current={active ? 'page' : undefined}
                            className={linkClassName}
                            onClick={() => setIsOpen(false)}
                          >
                            {inner}
                          </Link>
                        ) : (
                          <a
                            key={group.id}
                            href={group.href}
                            className={linkClassName}
                            onClick={e => {
                              setIsOpen(false);
                              setTimeout(
                                () => navigateToAnchor(group.href!, e),
                                120,
                              );
                            }}
                          >
                            {inner}
                          </a>
                        );
                      })}
                  </div>
                </nav>
              </div>

              <div className="flex flex-col gap-2 border-t border-border bg-muted/40 p-4">
                {isLoggedIn ? (
                  <LinkButton
                    size="lg"
                    to={dashboardPath}
                    className="w-full"
                    onClick={() => setIsOpen(false)}
                  >
                    <LayoutDashboardIcon data-icon="inline-start" />
                    <Trans message="Dashboard" />
                  </LinkButton>
                ) : (
                  <div
                    className={cn(
                      'grid gap-2',
                      registrationDisabled ? 'grid-cols-1' : 'grid-cols-2',
                    )}
                  >
                    <LinkButton
                      variant="outline"
                      size="lg"
                      to="/login"
                      onClick={() => setIsOpen(false)}
                    >
                      <Trans message="Sign in" />
                    </LinkButton>
                    {!registrationDisabled && (
                      <LinkButton
                        size="lg"
                        to="/register"
                        onClick={() => setIsOpen(false)}
                      >
                        <Trans message="Get started" />
                      </LinkButton>
                    )}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
