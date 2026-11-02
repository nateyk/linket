'use client';

import {useAuth} from '@common/auth/use-auth';
import {ColorSchemeContext} from '@common/core/color-scheme-provider';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {Button, LinkButton} from '@shadcn/button/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@shadcn/collapsible/collapsible';
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
import {
  ChevronDownIcon,
  LayoutDashboardIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  XIcon,
} from 'lucide-react';
import {useSettings} from '@ui/settings/use-settings';
import {use, useState, useEffect, MouseEvent} from 'react';
import {MegaMenu} from './mega-menu';

type HomeSection = {name: string; title?: string; badge?: string};
type HeaderProps = {sections?: HomeSection[]; anchors?: (string | undefined)[]};
type NavigationItem = {name: string; href: string; hasMegaMenu?: boolean};
type MobileNavItem = {title?: string; name?: string; href?: string};
function sectionLinks(sections: HomeSection[], anchors: (string | undefined)[]) {
  return sections.flatMap((section, index) => {
    if (section.name === 'pricing') return [{name: 'Pricing', href: '#pricing-section'}];
    if (!section.name.startsWith('feature-') && section.name !== 'features-grid') return [];
    return anchors[index] ? [{name: section.title || section.badge || 'Features', href: '#' + anchors[index]}] : [];
  });
}
// Section anchors ("#…") live on the landing page. When this header renders on
// another route (e.g. /pricing) the target isn't on the page, so hand the click
// to the landing instead of swallowing it. On the landing itself a target that
// isn't there stays a no-op, exactly as before.
const goToLandingSection = (targetId: string) => {
  if (window.location.pathname !== '/') {
    window.location.href = `/${targetId}`;
    return true;
  }
  return false;
};

// Smooth scroll function
const smoothScrollTo = (targetId: string) => {
  if (targetId.startsWith('#')) {
    const element = document.querySelector(targetId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    } else {
      goToLandingSection(targetId);
    }
  }
};

// Mega-menu links are plain "#…" anchors, so off the landing the browser would
// only swap in a dead hash. Reroute them to the landing's section; on the
// landing the browser's own jump (or its no-op when a section is gone) is
// untouched.
const onMegaMenuClick = (e: MouseEvent<HTMLDivElement>) => {
  const href = (e.target as Element | null)?.closest?.('a[href^="#"]')
    ?.getAttribute('href');
  if (!href || document.querySelector(href)) return;
  if (window.location.pathname === '/') return;
  e.preventDefault();
  goToLandingSection(href);
};

export function Header({sections = [], anchors = []}: HeaderProps) {
  const links = sectionLinks(sections, anchors);
  const navigationItems: NavigationItem[] = [...(links.length ? [{name: 'Features', href: links[0].href, hasMegaMenu: true}] : []), ...(sections.some(s => s.name === 'pricing') ? [{name: 'Pricing', href: '#pricing-section'}] : []), {name: 'Contact', href: '/contact'}];
  const solutionsItems: MobileNavItem[] = links.map(link => ({name: link.name, href: link.href}));
  const [isOpen, setIsOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const {colorScheme, setColorScheme} = use(ColorSchemeContext);
  const {getRedirectUri} = useAuth();
  const {branding} = useSettings();

  // Section links from other routes ("/pricing", "/contact") reload into
  // "/#…". The browser's fragment scroll races React's render of the landing
  // sections and the router's scroll restoration, which can reset the view to
  // the top right after the first scroll lands — so keep aiming until the
  // view settles. Visits without a hash (every normal landing visit) never
  // reach this scroll, and a user gesture during it wins immediately.
  useEffect(() => {
    if (window.location.pathname !== '/' || !window.location.hash) return;
    // Undecoded on purpose: every anchor id is kebab-case ASCII (see
    // buildSectionAnchors/slugifySectionTitle and the header's static hrefs),
    // so decoding buys nothing — and decodeURIComponent throws URIError on a
    // malformed fragment like "/#%", which would blank the landing.
    const id = window.location.hash.slice(1);
    if (!id) return;

    let stopped = false;
    let attempts = 0;
    let settledFrames = 0;
    const userGaveInput = () => {
      stopped = true;
    };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(type =>
      window.addEventListener(type, userGaveInput, {passive: true})
    );

    const scrollToTarget = () => {
      if (stopped) return;
      const target = document.getElementById(id);
      if (target) {
        const wanted = target.getBoundingClientRect().top + window.scrollY;
        if (Math.abs(window.scrollY - wanted) > 8) {
          // Late section mounts and router scroll restoration both land after
          // the first scroll; snap back until nothing displaces us.
          target.scrollIntoView({block: 'start'});
          settledFrames = 0;
        } else if (++settledFrames > 45) {
          return;
        }
      }
      // Sections are data-driven and may mount a frame or two late.
      if (++attempts < 600) requestAnimationFrame(scrollToTarget);
    };
    scrollToTarget();

    return () => {
      stopped = true;
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(type =>
        window.removeEventListener(type, userGaveInput)
      );
    };
  }, []);

  const toggleColorScheme = () => {
    setColorScheme(colorScheme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo */}
        <Logo className="h-8" url="/" />

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden xl:flex">
          <NavigationMenuList>
            {navigationItems.map(item => (
              <NavigationMenuItem key={item.name}>
                {item.hasMegaMenu ? (
                  <>
                    <NavigationMenuTrigger className="bg-transparent hover:bg-transparent focus:bg-transparent data-[active]:bg-transparent data-[state=open]:bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:text-primary focus:text-primary cursor-pointer">
                      {item.name}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent
                      className="left-1/2 w-[700px] max-w-[95vw] -translate-x-1/2 overflow-hidden rounded-xl border border-border/40 bg-card/95 shadow-xl backdrop-blur"
                      onClick={onMegaMenuClick}
                    >
                      <MegaMenu items={links} />
                    </NavigationMenuContent>
                  </>
                ) : (
                  <NavigationMenuLink
                    className="group inline-flex h-10 w-max items-center justify-center px-4 py-2 text-sm font-medium transition-colors hover:text-primary focus:text-primary focus-visible:outline-2 cursor-pointer"
                    onClick={e => {
                      e.preventDefault();
                      if (item.href.startsWith('#')) {
                        smoothScrollTo(item.href);
                      } else {
                        window.location.href = item.href;
                      }
                    }}
                  >
                    {item.name}
                  </NavigationMenuLink>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-2 xl:flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleColorScheme}
            className="cursor-pointer"
            aria-label={
              colorScheme === 'light'
                ? 'Switch to dark mode'
                : 'Switch to light mode'
            }
          >
            {colorScheme === 'light' ? <MoonIcon /> : <SunIcon />}
          </Button>
          <LinkButton
            variant="outline"
            to={getRedirectUri()}
            className="cursor-pointer"
          >
            <LayoutDashboardIcon data-icon="inline-start" />
            Dashboard
          </LinkButton>
          <LinkButton variant="ghost" to="/login" className="cursor-pointer">
            Sign In
          </LinkButton>
          <LinkButton to="/register" className="cursor-pointer">
            Get Started
          </LinkButton>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="xl:hidden size-11 cursor-pointer"
              />
            }
          >
            <MenuIcon />
            <span className="sr-only">Toggle menu</span>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-full sm:w-[400px] p-0 gap-0 [&>button]:hidden overflow-hidden flex flex-col"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <SheetHeader className="p-4 pb-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {/* The compact logo renders a 16px image inside its link;
                        pad the link (not the glyph) so the target clears the
                        WCAG 2.5.8 24px floor. */}
                    <span className="flex [&>a]:flex [&>a]:min-h-6 [&>a]:min-w-6 [&>a]:items-center [&>a]:justify-center">
                      <Logo logoType="compact" className="h-4" url="/" />
                    </span>
                  </div>
                  <SheetTitle className="sr-only">
                    {branding.site_name}
                  </SheetTitle>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={toggleColorScheme}
                      className="cursor-pointer"
                      aria-label={
                        colorScheme === 'light'
                          ? 'Switch to dark mode'
                          : 'Switch to light mode'
                      }
                    >
                      <MoonIcon className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <SunIcon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setIsOpen(false)}
                      className="cursor-pointer"
                      aria-label="Close menu"
                    >
                      <XIcon />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto">
                <nav className="flex flex-col gap-1 p-6">
                  {navigationItems.map(item => (
                    <div key={item.name}>
                      {item.hasMegaMenu ? (
                        <Collapsible
                          open={solutionsOpen}
                          onOpenChange={setSolutionsOpen}
                        >
                          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
                            {item.name}
                            <ChevronDownIcon
                              className={`h-4 w-4 transition-transform ${solutionsOpen ? 'rotate-180' : ''}`}
                            />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="flex flex-col gap-1 pl-4">
                            {solutionsItems.map((solution, index) =>
                              solution.title ? (
                                <div
                                  key={`title-${index}`}
                                  className="px-4 mt-5 py-2 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider"
                                >
                                  {solution.title}
                                </div>
                              ) : (
                                <a
                                  key={solution.name}
                                  href={solution.href}
                                  className="flex items-center px-4 py-2 text-sm rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                  onClick={e => {
                                    setIsOpen(false);
                                    const href = solution.href;
                                    if (href && href.startsWith('#')) {
                                      e.preventDefault();
                                      setTimeout(() => smoothScrollTo(href), 100);
                                    }
                                  }}
                                >
                                  {solution.name}
                                </a>
                              ),
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <a
                          href={item.href}
                          className="flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                          onClick={e => {
                            setIsOpen(false);
                            if (item.href.startsWith('#')) {
                              e.preventDefault();
                              setTimeout(() => smoothScrollTo(item.href), 100);
                            }
                          }}
                        >
                          {item.name}
                        </a>
                      )}
                    </div>
                  ))}
                </nav>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col gap-4 border-t p-6">
                {/* Primary Actions */}
                <div className="flex flex-col gap-3">
                  <LinkButton
                    variant="outline"
                    size="lg"
                    to={getRedirectUri()}
                    className="w-full cursor-pointer"
                  >
                    <LayoutDashboardIcon data-icon="inline-start" />
                    Dashboard
                  </LinkButton>

                  <div className="grid grid-cols-2 gap-3">
                    <LinkButton
                      variant="outline"
                      size="lg"
                      to="/login"
                      className="cursor-pointer"
                    >
                      Sign In
                    </LinkButton>
                    <LinkButton
                      size="lg"
                      to="/register"
                      className="cursor-pointer"
                    >
                      Get Started
                    </LinkButton>
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
