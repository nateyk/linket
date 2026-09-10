"use client";

import {Book, Menu, Sunset, Trees, Zap} from "lucide-react";
import {Accordion} from "@shadcn/accordion/accordion";
import {Button} from "@shadcn/button/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@shadcn/navigation-menu";
import {Drawer} from "@shadcn/drawer/drawer";
import {cn} from "@ui/utils/cn";
import {Logo} from "@common/ui/navigation/navbar/logo";
import {Link} from "react-router";

interface MenuItem {
  title: string;
  url: string;
  description?: string;
  icon?: React.ReactNode;
  items?: MenuItem[];
}

const menu: MenuItem[] = [
  {title: "Home", url: "/"},
  {
    title: "Product",
    url: "#",
    items: [
      {
        title: "Blog",
        description: "The latest industry news, updates, and info",
        icon: <Book className="size-5 shrink-0" />,
        url: "#",
      },
      {
        title: "Company",
        description: "Our mission is to innovate and empower the world",
        icon: <Trees className="size-5 shrink-0" />,
        url: "#",
      },
      {
        title: "Careers",
        description: "Browse job listing and discover our workspace",
        icon: <Sunset className="size-5 shrink-0" />,
        url: "#",
      },
      {
        title: "Support",
        description: "Get in touch with our support team or visit our community forums",
        icon: <Zap className="size-5 shrink-0" />,
        url: "#",
      },
    ],
  },
  {
    title: "Resources",
    url: "#",
    items: [
      {
        title: "Help Center",
        description: "Get all the answers you need right here",
        icon: <Zap className="size-5 shrink-0" />,
        url: "#",
      },
      {
        title: "Contact Us",
        description: "We are here to help you with any questions you have",
        icon: <Sunset className="size-5 shrink-0" />,
        url: "#",
      },
      {
        title: "Status",
        description: "Check the current status of our services and APIs",
        icon: <Trees className="size-5 shrink-0" />,
        url: "#",
      },
      {
        title: "Terms of Service",
        description: "Our terms and conditions for using our services",
        icon: <Book className="size-5 shrink-0" />,
        url: "#",
      },
    ],
  },
  {title: "Pricing", url: "/pricing"},
  {title: "Blog", url: "/blog"},
];

const auth = {
  login: {title: "Sign In", url: "/login"},
  signup: {title: "Get Started", url: "/register"},
};

export function Header({className}: {className?: string}) {
  return (
    <section className={cn("sticky top-0 z-50 w-full bg-background py-4 border-b border-border/40 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80", className)}>
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {/* Desktop Menu */}
        <nav className="hidden items-center justify-between lg:flex">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-7 w-auto" />
            </Link>
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList>
                  {menu.map((item) => renderMenuItem(item))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" render={<Link to={auth.login.url} />}>
              {auth.login.title}
            </Button>
            <Button size="sm" render={<Link to={auth.signup.url} />}>
              {auth.signup.title}
            </Button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-7 w-auto" />
            </Link>
            <Drawer.Root position="right">
              <Drawer.Trigger
                render={
                  <Button variant="outline" size="icon" className="size-9">
                    <Menu className="size-4" />
                  </Button>
                }
              />
              <Drawer.Portal>
                <Drawer.Backdrop className="bg-background" />
                <Drawer.Content
                  className="flex flex-col bg-background w-full h-full"
                  popupClassName="p-0 w-screen h-[100dvh] max-w-none m-0 rounded-none inset-0 bg-background sm:max-w-none"
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background shrink-0">
                    <Link to="/" className="flex items-center gap-2">
                      <Logo className="h-7 w-auto" />
                    </Link>
                    <Drawer.Close
                      render={
                        <Button variant="ghost" size="icon" className="size-9">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-4"
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </Button>
                      }
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto overscroll-contain bg-background">
                    <Accordion className="flex w-full flex-col">
                      {menu.map((item) => renderMobileMenuItem(item))}
                    </Accordion>
                  </div>
                  <div className="p-4 border-t bg-background flex flex-col gap-3 shrink-0">
                    <Button variant="outline" size="lg" className="w-full" render={<Link to={auth.login.url} />}>
                      {auth.login.title}
                    </Button>
                    <Button size="lg" className="w-full shadow-sm" render={<Link to={auth.signup.url} />}>
                      {auth.signup.title}
                    </Button>
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          </div>
        </div>
      </div>
    </section>
  );
}

const renderMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
        <NavigationMenuContent className="bg-popover text-popover-foreground">
          {item.items.map((subItem) => (
            <NavigationMenuLink asChild key={subItem.title} className="w-80">
              <SubMenuLink item={subItem} />
            </NavigationMenuLink>
          ))}
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem key={item.title}>
      <NavigationMenuLink
        href={item.url}
        className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {item.title}
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
};

const renderMobileMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <Accordion.Item key={item.title} value={item.title} className="border-b last:border-b-0">
        <Accordion.Trigger className="px-6 py-4 text-[15px] font-medium hover:no-underline hover:bg-accent/30 data-[panel-open]:bg-accent/20 transition-colors">
          {item.title}
        </Accordion.Trigger>
        <Accordion.Content className="px-3 pb-4 bg-muted/20 data-[panel-open]:animate-accordion-down">
          <div className="flex flex-col gap-3 pt-3">
            {item.items.map((subItem) => (
              <SubMenuLink key={subItem.title} item={subItem} />
            ))}
          </div>
        </Accordion.Content>
      </Accordion.Item>
    );
  }

  return (
    <a
      key={item.title}
      href={item.url}
      className="flex items-center px-6 py-4 text-[15px] font-medium border-b last:border-b-0 hover:bg-accent/30 transition-colors"
    >
      {item.title}
    </a>
  );
};

const SubMenuLink = ({item}: {item: MenuItem}) => {
  return (
    <a
      className="flex flex-row gap-4 rounded-xl p-4 leading-none no-underline transition-colors outline-none select-none hover:bg-accent hover:text-accent-foreground border border-transparent hover:border-border/50 hover:shadow-sm active:bg-accent"
      href={item.url}
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-muted border text-foreground shrink-0 shadow-sm">
        <span className="[&_svg]:size-5">{item.icon}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-sm font-semibold tracking-tight">{item.title}</div>
        {item.description && (
          <p className="text-xs leading-snug text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>
    </a>
  );
};
