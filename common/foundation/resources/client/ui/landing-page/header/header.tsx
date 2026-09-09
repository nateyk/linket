"use client";

import {Logo} from "@common/ui/navigation/navbar/logo";
import {Button} from "@shadcn/button/button";
import {DesktopNav} from "./desktop-nav";
import {MobileNav} from "./mobile-nav";
import {Link} from "react-router";
import {useScroll} from "@common/hooks/use-scroll";
import {motion} from "framer-motion";

export function Header() {
  const scrolled = useScroll(10);

  return (
    <motion.header
      initial={false}
      animate={{
        backgroundColor: scrolled ? "hsl(var(--background) / 0.8)" : "hsl(var(--background) / 0)",
        backdropFilter: scrolled ? "blur(8px)" : "blur(0px)",
        boxShadow: scrolled ? "0 1px 3px 0 hsl(var(--border) / 0.1), 0 1px 2px -1px hsl(var(--border) / 0.1)" : "0 0 0 0 transparent",
      }}
      transition={{duration: 0.2, ease: [0.4, 0, 0.2, 1]}}
      className="sticky top-0 z-50 w-full border-transparent bg-background/0"
    >
    
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
    </motion.header>
  );
}
