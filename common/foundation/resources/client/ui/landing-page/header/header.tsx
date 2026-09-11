'use client';

import {useAuth} from '@common/auth/use-auth';
import {ColorSchemeContext} from '@common/core/color-scheme-provider';
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
  GithubIcon,
  LayoutDashboardIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  XIcon,
} from 'lucide-react';
import {use, useState} from 'react';
import {MegaMenu} from './mega-menu';
import {StoreLogo} from './store-logo';

const navigationItems = [
  {name: 'Home', href: '#hero'},
  {name: 'Features', href: '#features'},
  {name: 'Solutions', href: '#features', hasMegaMenu: true},
  {name: 'Team', href: '#team'},
  {name: 'Pricing', href: '#pricing'},
  {name: 'FAQ', href: '#faq'},
  {name: 'Contact', href: '#contact'},
];

// Solutions menu items for mobile
const solutionsItems = [
  {title: 'Browse Products'},
  {name: 'Free Blocks', href: '#free-blocks'},
  {name: 'Premium Templates', href: '#premium-templates'},
  {name: 'Admin Dashboards', href: '#admin-dashboards'},
  {name: 'Landing Pages', href: '#landing-pages'},
  {title: 'Categories'},
  {name: 'E-commerce', href: '#ecommerce'},
  {name: 'SaaS Dashboards', href: '#saas-dashboards'},
  {name: 'Analytics', href: '#analytics'},
  {name: 'Authentication', href: '#authentication'},
  {title: 'Resources'},
  {name: 'Documentation', href: '#docs'},
  {name: 'Component Showcase', href: '#showcase'},
  {name: 'GitHub Repository', href: '#github'},
  {name: 'Design System', href: '#design-system'},
];

// Smooth scroll function
const smoothScrollTo = (targetId: string) => {
  if (targetId.startsWith('#')) {
    const element = document.querySelector(targetId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }
};

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const {colorScheme, setColorScheme} = use(ColorSchemeContext);
  const {getRedirectUri} = useAuth();

  const toggleColorScheme = () => {
    setColorScheme(colorScheme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <a
            href="https://shadcnstore.com"
            className="flex cursor-pointer items-center gap-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            <StoreLogo size={32} />
            <span className="font-bold">ShadcnStore</span>
          </a>
        </div>

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
                    <NavigationMenuContent className="left-1/2 w-[700px] max-w-[95vw] -translate-x-1/2 overflow-hidden rounded-xl border border-border/40 bg-card/95 shadow-xl backdrop-blur">
                      <MegaMenu />
                    </NavigationMenuContent>
                  </>
                ) : (
                  <NavigationMenuLink
                    className="group inline-flex h-10 w-max items-center justify-center px-4 py-2 text-sm font-medium transition-colors hover:text-primary focus:text-primary focus:outline-none cursor-pointer"
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
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            render={
              <a
                href="https://github.com/silicondeck/shadcn-dashboard-landing-template"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub Repository"
              />
            }
          >
            <GithubIcon />
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
                className="xl:hidden cursor-pointer"
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
                    <StoreLogo size={16} />
                  </div>
                  <SheetTitle className="text-lg font-semibold">
                    ShadcnStore
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
                      className="cursor-pointer"
                      render={
                        <a
                          href="https://github.com/silicondeck/shadcn-dashboard-landing-template"
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="GitHub Repository"
                        />
                      }
                    >
                      <GithubIcon />
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
                                    if (solution.href?.startsWith('#')) {
                                      e.preventDefault();
                                      setTimeout(
                                        () => smoothScrollTo(solution.href),
                                        100,
                                      );
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
