"use client";

import {cn} from "@ui/utils/cn";
import {Logo} from "@common/ui/navigation/navbar/logo";
import {useScroll} from "@common/hooks/use-scroll";
import {Button} from "@shadcn/button/button";
import {DesktopNav} from "./desktop-nav";
import {MobileNav} from "./mobile-nav";
import {Link} from "react-router";

export function Header() {
  const scrolled = useScroll(10);

  return (
    <header
      className={cn("sticky top-0 z-50 w-full border-transparent border-b", {
        "border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/50":
          scrolled,
      })}
    >
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-5">
          <Link
            className="flex items-center rounded-xl px-2 py-2 hover:bg-muted dark:hover:bg-muted/50 transition-colors"
            to="/"
          >
            <Logo className="h-7 w-auto" />
          </Link>
          <DesktopNav />
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" size="sm" render={<Link to="/login" />}>
            Sign In
          </Button>
          <Button size="sm" render={<Link to="/register" />}>
            Get Started
          </Button>
        </div>
        <MobileNav />
      </nav>
    </header>
  );
}
