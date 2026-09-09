import {cn} from "@ui/utils/cn";
import React from "react";
import {Button} from "@shadcn/button/button";
import {Portal, PortalBackdrop} from "../../portal/portal";
import {companyLinks, companyLinks2, productLinks} from "./nav-links";
import {LinkItem} from "./sheard";
import {MenuIcon, XIcon} from "lucide-react";
import {AnimatePresence, motion} from "framer-motion";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="md:hidden">
      <Button
        aria-controls="mobile-menu"
        aria-expanded={open}
        aria-label="Toggle menu"
        className="md:hidden"
        onClick={() => setOpen(!open)}
        size="icon"
        variant="outline"
      >
        <div
          className={cn(
            "transition-all",
            open ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )}
        >
          <XIcon />
        </div>
        <div
          className={cn(
            "absolute transition-all",
            open ? "scale-0 opacity-0" : "scale-100 opacity-100"
          )}
        >
          <MenuIcon />
        </div>
      </Button>
      <AnimatePresence>
        {open && (
          <Portal className="top-14">
            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.2}}
              className="absolute inset-0"
            >
              <PortalBackdrop onClick={() => setOpen(false)} />
            </motion.div>
            <motion.div
              initial={{opacity: 0, y: 8, scale: 0.98}}
              animate={{opacity: 1, y: 0, scale: 1}}
              exit={{opacity: 0, y: 8, scale: 0.98}}
              transition={{duration: 0.22, ease: [0.16, 1, 0.3, 1]}}
              className="size-full overflow-y-auto p-4 bg-background shadow-xl border-t"
            >
              <div className="flex w-full flex-col gap-y-3">
                <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Product</span>
                {productLinks.map((link) => (
                  <LinkItem
                    className="rounded-xl p-3 active:bg-muted dark:active:bg-muted/50 hover:bg-accent transition-colors"
                    key={`product-${link.label}`}
                    {...link}
                  />
                ))}
                <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mt-2">Company</span>
                {companyLinks.map((link) => (
                  <LinkItem
                    className="rounded-xl p-3 active:bg-muted dark:active:bg-muted/50 hover:bg-accent transition-colors"
                    key={`company-${link.label}`}
                    {...link}
                  />
                ))}
                {companyLinks2.map((link) => (
                  <LinkItem
                    className="rounded-xl p-3 active:bg-muted dark:active:bg-muted/50 hover:bg-accent transition-colors"
                    key={`company-${link.label}`}
                    {...link}
                  />
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-2.5">
                <Button className="w-full" variant="outline" onClick={() => setOpen(false)}>
                  Sign In
                </Button>
                <Button className="w-full shadow-sm" onClick={() => setOpen(false)}>Get Started</Button>
              </div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}
