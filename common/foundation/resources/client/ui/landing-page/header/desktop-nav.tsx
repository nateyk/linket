import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@shadcn/navigation-menu";
import {companyLinks, companyLinks2, productLinks} from "./nav-links";
import {LinkItem} from "./sheard";

export function DesktopNav() {
  return (
    <NavigationMenu className="hidden md:flex">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent hover:bg-accent/50 data-[state=open]:bg-accent/50">
            Product
          </NavigationMenuTrigger>
          <NavigationMenuContent className="bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/80 p-2 rounded-xl border shadow-xl">
            <div className="grid w-[560px] grid-cols-2 gap-2">
              {productLinks.map((item, i) => (
                <NavigationMenuLink asChild key={`item-${item.label}-${i}`}>
                  <LinkItem {...item} />
                </NavigationMenuLink>
              ))}
            </div>
            <div className="mt-2 rounded-lg bg-muted/50 p-3 border">
              <p className="text-muted-foreground text-sm">
                Interested?{" "}
                <a
                  className="font-medium text-foreground hover:underline underline-offset-4"
                  href="#"
                >
                  Schedule a demo
                </a>
              </p>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent hover:bg-accent/50 data-[state=open]:bg-accent/50">
            Company
          </NavigationMenuTrigger>
          <NavigationMenuContent className="bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/80 p-2 rounded-xl border shadow-xl">
            <div className="grid w-[560px] grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-2 shadow-sm">
                <div className="space-y-1">
                  {companyLinks.map((item, i) => (
                    <NavigationMenuLink asChild key={`item-${item.label}-${i}`}>
                      <LinkItem {...item} />
                    </NavigationMenuLink>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border bg-card p-2 shadow-sm">
                <div className="space-y-1">
                  {companyLinks2.map((item, i) => (
                    <NavigationMenuLink key={`item-${item.label}-${i}`} href={item.href} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-accent transition-colors">
                      <span className="flex size-8 items-center justify-center rounded-md bg-muted border text-muted-foreground [&_svg]:size-4">
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </NavigationMenuLink>
                  ))}
                </div>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            href="#"
            className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Pricing
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            href="#"
            className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Blog
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
