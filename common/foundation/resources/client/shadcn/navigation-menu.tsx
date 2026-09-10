import {cn} from "@ui/utils/cn";
import * as React from "react";

function NavigationMenu({className, children, ...props}: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="navigation-menu"
      className={cn("relative flex max-w-max flex-1 items-center justify-center", className)}
      {...props}
    >
      {children}
    </nav>
  );
}

function NavigationMenuList({className, ...props}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="navigation-menu-list"
      className={cn("flex flex-1 list-none items-center justify-center gap-1", className)}
      {...props}
    />
  );
}

function NavigationMenuItem({className, children, ...props}: React.ComponentProps<"li">) {
  return (
    <li data-slot="navigation-menu-item" className={cn("relative group", className)} {...props}>
      {children}
    </li>
  );
}

function NavigationMenuTrigger({className, children, ...props}: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="navigation-menu-trigger"
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 group-data-[state=open]:bg-accent/50",
        className
      )}
      {...props}
    >
      {children}
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
        className="ml-1 size-3 transition duration-300 group-hover:rotate-180"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

function NavigationMenuContent({className, children, ...props}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="navigation-menu-content"
      className={cn(
        "absolute left-0 top-full pt-2 hidden group-hover:block group-focus-within:block animate-in fade-in slide-in-from-top-2 duration-200 w-auto z-50 before:absolute before:inset-x-0 before:-top-2 before:h-2 before:content-['']",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function NavigationMenuLink({className, children, asChild, ...props}: React.ComponentProps<"a"> & {asChild?: boolean}) {
  const Comp = asChild ? "span" : "a";
  return (
    <Comp
      data-slot="navigation-menu-link"
      className={cn(
        "block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
};
