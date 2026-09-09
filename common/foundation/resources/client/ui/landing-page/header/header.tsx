"use client";

import {Logo} from "@common/ui/navigation/navbar/logo";
import {Button} from "@shadcn/button/button";
import {DesktopNav} from "./desktop-nav";
import {MobileNav} from "./mobile-nav";
import {Link} from "react-router";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background">
    
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link
            className="flex items-center rounded-xl px-2 py-2 hover:bg-muted dark:hover:bg-muted/50 transition-colors"
            to="/"
          >
            <Logo className="h-6 w-auto" />
          </Link>
          <DesktopNav />
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" render={<Link to="/login" />}>
            Sign In
          </Button>
          <Button render={<Link to="/register" />}>Get Started</Button>
        </div>
        <MobileNav />
      </nav>
    </header>
  );
}
