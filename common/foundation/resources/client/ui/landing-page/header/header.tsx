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
        title: "Website Builder",
        description: "Create responsive websites with ease",
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
    <section className={cn("sticky top-0 z-50 w-full bg-background py-4 border-b border-border/40 backdrop-blur-sm", className)}>
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
                  <Button variant="outline" size="icon">
                    <Menu className="size-4" />
                  </Button>
                }
              />
              <Drawer.Portal>
                <Drawer.Backdrop />
                <Drawer.Content>
                  <Drawer.Header>
                    <Drawer.Title className="sr-only">Navigation</Drawer.Title>
                  </Drawer.Header>
                  <div className="flex flex-col gap-6 p-4 overflow-y-auto">
                    <Accordion className="flex w-full flex-col gap-4">
                      {menu.map((item) => renderMobileMenuItem(item))}
                    </Accordion>

                    <div className="flex flex-col gap-3">
                      <Button variant="outline" render={<Link to={auth.login.url} />}>
                        {auth.login.title}
                      </Button>
                      <Button render={<Link to={auth.signup.url} />}>
                        {auth.signup.title}
                      </Button>
                    </div>
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
        className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-accent-foreground"
      >
        {item.title}
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
};

const renderMobileMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <Accordion.Item key={item.title} value={item.title} className="border-b-0">
        <Accordion.Trigger className="text-md py-0 font-semibold hover:no-underline">
          {item.title}
        </Accordion.Trigger>
        <Accordion.Content className="mt-2">
          {item.items.map((subItem) => (
            <SubMenuLink key={subItem.title} item={subItem} />
          ))}
        </Accordion.Content>
      </Accordion.Item>
    );
  }

  return (
    <a key={item.title} href={item.url} className="text-md font-semibold px-4 py-2">
      {item.title}
    </a>
  );
};

const SubMenuLink = ({item}: {item: MenuItem}) => {
  return (
    <a
      className="flex min-w-80 flex-row gap-4 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none hover:bg-muted hover:text-accent-foreground"
      href={item.url}
    >
      <div className="text-foreground">{item.icon}</div>
      <div>
        <div className="text-sm font-semibold">{item.title}</div>
        {item.description && (
          <p className="text-sm leading-snug text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>
    </a>
  );
};
