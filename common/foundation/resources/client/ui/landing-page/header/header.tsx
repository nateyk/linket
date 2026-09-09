"use client";

import {cn} from "@ui/utils/cn";
import {Logo} from "@common/ui/navigation/navbar/logo";
import {useScroll} from "@common/hooks/use-scroll";
import {Button} from "@shadcn/button/button";
import {DesktopNav} from "./desktop-nav";
import {MobileNav} from "./mobile-nav";
import {Link} from "react-router";
import {motion} from "framer-motion";

export function Header() {
  const scrolled = useScroll(10);

  return (
    <motion.header
      initial={false}
      animate={{
        backgroundColor: scrolled ? "hsl(var(--background) / 0.95)" : "hsl(var(--background) / 0)",
        borderColor: scrolled ? "hsl(var(--border))" : "transparent",
        backdropFilter: scrolled ? "blur(8px)" : "blur(0px)",
      }}
      transition={{duration: 0.22, ease: [0.4, 0, 0.2, 1]}}
      className={cn(
        "sticky top-0 z-50 w-full border-b",
        scrolled
          ? "border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 shadow-sm"
          : "border-transparent bg-background/0"
      )}
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
