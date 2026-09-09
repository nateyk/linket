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
    <section className={cn("sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 py-4", className)}>
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {/* Desktop Menu */}
        <nav className="hidden items-center justify-between lg:flex">
          <div className="flex items-center gap-8">
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
            <Button variant="outline" size="sm" render={<Link to={auth.login.url} />}>{auth.login.title}</Button>
            <Button size="sm" render={<Link to={auth.signup.url} />}>{auth.signup.title}</Button>
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
                <Drawer.Backdrop className="bg-black/20 backdrop-blur-sm" />
                <Drawer.Content className="flex flex-col p-0 sm:max-w-sm w-[85vw] max-w-[85vw]">
                  <Drawer.Header className="p-6 pb-4 border-b">
                    <Link to="/" className="flex items-center gap-2">
                      <Logo className="h-6 w-auto" />
                    </Link>
                    <Drawer.Title className="sr-only">Navigation</Drawer.Title>
                  </Drawer.Header>
                  <div className="flex-1 overflow-y-auto">
                    <Accordion className="flex w-full flex-col">
                      {menu.map((item) => renderMobileMenuItem(item))}
                    </Accordion>
                  </div>
                  <div className="p-6 pt-4 border-t bg-muted/10 flex flex-col gap-3">
                    <Button variant="outline" size="lg" className="w-full" render={<Link to={auth.login.url} />}>{auth.login.title}</Button>
                    <Button size="lg" className="w-full shadow-sm" render={<Link to={auth.signup.url} />}>{auth.signup.title}</Button>
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
        <NavigationMenuTrigger className="bg-transparent hover:bg-accent/50 data-[state=open]:bg-accent/50">
          {item.title}
        </NavigationMenuTrigger>
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
        className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {item.title}
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
};

const renderMobileMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <Accordion.Item key={item.title} value={item.title} className="border-b">
        <Accordion.Trigger className="px-6 py-4 text-[15px] font-medium hover:no-underline hover:bg-accent/50 data-[panel-open]:bg-accent/30">
          {item.title}
        </Accordion.Trigger>
        <Accordion.Content className="px-3 pb-4 bg-muted/30">
          <div className="flex flex-col gap-2 pt-2">
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
      className="flex items-center px-6 py-4 text-[15px] font-medium border-b hover:bg-accent/50 transition-colors"
    >
      {item.title}
    </a>
  );
};

const SubMenuLink = ({item}: {item: MenuItem}) => {
  return (
    <a
      className="flex flex-row gap-4 rounded-xl p-3 leading-none no-underline transition-colors outline-none select-none hover:bg-accent hover:text-accent-foreground border border-transparent hover:border-border/50 hover:shadow-sm"
      href={item.url}
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-muted border text-foreground shrink-0">
        <span className="[&_svg]:size-5">{item.icon}</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold">{item.title}</div>
        {item.description && (
          <p className="text-xs leading-snug text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>
    </a>
  );
};
