'use client';
import React from 'react';
import {Button} from '@shadcn/button/button';
import {cn} from '@ui/utils/cn';
import {MenuToggleIcon} from '@shadcn/menu-toggle-icon/menu-toggle-icon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@shadcn/collapsible/collapsible';
import {createPortal} from 'react-dom';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@shadcn/navigation-menu';
import {LucideIcon} from 'lucide-react';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {
  ChevronDownIcon,
  CodeIcon,
  GlobeIcon,
  LayersIcon,
  UserPlusIcon,
  Users,
  Star,
  FileText,
  Shield,
  RotateCcw,
  Handshake,
  Leaf,
  HelpCircle,
  BarChart,
  PlugIcon,
  XIcon,
} from 'lucide-react';

type LinkItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export function Header() {
  const [open, setOpen] = React.useState(false);
  const [productOpen, setProductOpen] = React.useState(false);
  const [companyOpen, setCompanyOpen] = React.useState(false);
  const scrolled = useScroll(10);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn('sticky top-0 z-50 w-full border-b border-transparent', {
        'bg-background/95 supports-[backdrop-filter]:bg-background/50 border-border backdrop-blur-lg':
          scrolled,
      })}
    >
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-5">
          <Logo className="h-4" url="/" />
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent">Product</NavigationMenuTrigger>
                <NavigationMenuContent className="bg-card/95 backdrop-blur rounded-xl border border-border/40 p-1 pr-1.5">
                  <ul className="grid w-lg grid-cols-2 gap-2 rounded p-2 border-border/40 bg-card/95 backdrop-blur">
                    {productLinks.map((item, i) => (
                      <li key={i}>
                        <ListItem {...item} />
                      </li>
                    ))}
                  </ul>
                  <div className="p-2">
                    <p className="text-muted-foreground text-sm">
                      Interested?{' '}
                      <a href="#" className="text-foreground font-medium hover:underline">
                        Schedule a demo
                      </a>
                    </p>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent">Company</NavigationMenuTrigger>
                <NavigationMenuContent className="bg-card/95 backdrop-blur rounded-xl border border-border/40 p-1 pr-1.5 pb-1.5">
                  <div className="grid w-lg grid-cols-2 gap-2">
                    <ul className="grid w-lg grid-cols-2 gap-2 rounded p-2 border-border/40 bg-card/95 backdrop-blur">
                      {companyLinks.map((item, i) => (
                        <li key={i}>
                          <ListItem {...item} />
                        </li>
                      ))}
                    </ul>
                    <ul className="space-y-2 p-3">
                      {companyLinks2.map((item, i) => (
                        <li key={i}>
                          <NavigationMenuLink
                            href={item.href}
                            className="flex p-2 hover:bg-accent flex-row rounded-md items-center gap-x-2"
                          >
                            <item.icon className="text-foreground size-4" />
                            <span className="font-medium">{item.title}</span>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuLink className="px-4" asChild>
                <a href="#" className="hover:bg-accent rounded-md p-2">
                  Pricing
                </a>
              </NavigationMenuLink>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline">Sign In</Button>
          <Button>Get Started</Button>
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => setOpen(!open)}
          className="md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Toggle menu"
        >
          <MenuToggleIcon open={open} className="size-5" duration={300} />
        </Button>
      </nav>
      <MobileMenu open={open} className="flex flex-col justify-between gap-0 overflow-y-auto">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Logo className="h-4" url="/" />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="ml-auto size-8"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
        <div className="flex w-full flex-col">
          <Collapsible
            open={productOpen}
            onOpenChange={setProductOpen}
            className="border-b"
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/50">
              Product
              <ChevronDownIcon
                className={cn(
                  'size-4 transition-transform',
                  productOpen && 'rotate-180',
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pb-2">
              <div className="flex flex-col gap-1 rounded border border-border/40 bg-card/95 p-2 backdrop-blur">
                {productLinks.map(link => (
                  <ListItem key={link.title} {...link} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible
            open={companyOpen}
            onOpenChange={setCompanyOpen}
            className="border-b"
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/50">
              Company
              <ChevronDownIcon
                className={cn(
                  'size-4 transition-transform',
                  companyOpen && 'rotate-180',
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pb-2">
              <div className="flex flex-col gap-1 rounded border border-border/40 bg-card/95 p-2 backdrop-blur">
                {companyLinks.map(link => (
                  <ListItem key={link.title} {...link} />
                ))}
                {companyLinks2.map(link => (
                  <ListItem key={link.title} {...link} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
          <a href="#" className="px-4 py-3 text-sm font-medium border-b hover:bg-accent/50">Pricing</a>
        </div>
        <div className="flex flex-col gap-2 p-4 border-t">
          <Button variant="outline" className="w-full bg-transparent">
            Sign In
          </Button>
          <Button className="w-full">Get Started</Button>
        </div>
      </MobileMenu>
    </header>
  );
}

type MobileMenuProps = React.ComponentProps<'div'> & {
  open: boolean;
};

function MobileMenu({open, children, className, ...props}: MobileMenuProps) {
  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div
      id="mobile-menu"
      className={cn(
        'bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg',
        'fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y md:hidden',
      )}
    >
      <div
        data-slot={open ? 'open' : 'closed'}
        className={cn(
          'data-[slot=open]:animate-in data-[slot=open]:zoom-in-97 ease-out',
          'size-full p-4',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function ListItem({
  title,
  description,
  icon: Icon,
  className,
  href,
  ...props
}: React.ComponentProps<typeof NavigationMenuLink> & LinkItem) {
  return (
    <NavigationMenuLink
      className={cn(
        'w-full flex flex-row gap-x-2 data-[active=true]:focus:bg-accent data-[active=true]:hover:bg-accent data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground rounded-sm p-2',
        className,
      )}
      {...props}
      asChild
    >
      <a href={href}>
        <div className="bg-background/40 flex aspect-square size-12 items-center justify-center rounded-md border shadow-sm">
          <Icon className="text-foreground size-5" />
        </div>
        <div className="flex flex-col items-start justify-center">
          <span className="font-medium">{title}</span>
          <span className="text-muted-foreground text-xs">{description}</span>
        </div>
      </a>
    </NavigationMenuLink>
  );
}

const productLinks: LinkItem[] = [
  {
    title: 'Website Builder',
    href: '#',
    description: 'Create responsive websites with ease',
    icon: GlobeIcon,
  },
  {
    title: 'Cloud Platform',
    href: '#',
    description: 'Deploy and scale apps in the cloud',
    icon: LayersIcon,
  },
  {
    title: 'Team Collaboration',
    href: '#',
    description: 'Tools to help your teams work better together',
    icon: UserPlusIcon,
  },
  {
    title: 'Analytics',
    href: '#',
    description: 'Track and analyze your website traffic',
    icon: BarChart,
  },
  {
    title: 'Integrations',
    href: '#',
    description: 'Connect your apps and services',
    icon: PlugIcon,
  },
  {
    title: 'API',
    href: '#',
    description: 'Build custom integrations with our API',
    icon: CodeIcon,
  },
];

const companyLinks: LinkItem[] = [
  {
    title: 'About Us',
    href: '#',
    description: 'Learn more about our story and team',
    icon: Users,
  },
  {
    title: 'Customer Stories',
    href: '#',
    description: 'See how we’ve helped our clients succeed',
    icon: Star,
  },
  {
    title: 'Partnerships',
    href: '#',
    icon: Handshake,
    description: 'Collaborate with us for mutual growth',
  },
];

const companyLinks2: LinkItem[] = [
  {
    title: 'Terms of Service',
    href: '#',
    icon: FileText,
  },
  {
    title: 'Privacy Policy',
    href: '#',
    icon: Shield,
  },
  {
    title: 'Refund Policy',
    href: '#',
    icon: RotateCcw,
  },
  {
    title: 'Blog',
    href: '#',
    icon: Leaf,
  },
  {
    title: 'Help Center',
    href: '#',
    icon: HelpCircle,
  },
];

function useScroll(threshold: number) {
  const [scrolled, setScrolled] = React.useState(false);

  const onScroll = React.useCallback(() => {
    setScrolled(window.scrollY > threshold);
  }, [threshold]);

  React.useEffect(() => {
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  // also check on first load
  React.useEffect(() => {
    onScroll();
  }, [onScroll]);

  return scrolled;
}


