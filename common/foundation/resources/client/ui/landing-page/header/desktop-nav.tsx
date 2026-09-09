import {Button} from "@shadcn/button/button";
import {LinkItem} from "./sheard";
import {companyLinks, companyLinks2, productLinks} from "./nav-links";
import {useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";

export function DesktopNav() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <nav ref={navRef} className="hidden md:flex items-center gap-1">
      <div className="relative">
        <Button
          variant="ghost"
          className="bg-transparent data-[state=open]:bg-accent"
          data-state={openMenu === "product" ? "open" : "closed"}
          onClick={() => setOpenMenu(openMenu === "product" ? null : "product")}
        >
          Product
        </Button>
        <AnimatePresence>
          {openMenu === "product" && (
            <motion.div
              initial={{opacity: 0, y: 6, scale: 0.98}}
              animate={{opacity: 1, y: 0, scale: 1}}
              exit={{opacity: 0, y: 6, scale: 0.98}}
              transition={{duration: 0.18, ease: [0.16, 1, 0.3, 1]}}
              className="absolute top-full left-0 mt-2 p-1.5 bg-popover/80 backdrop-blur-md rounded-xl shadow-xl ring-1 ring-border z-50 overflow-hidden"
            >
              <div className="rounded-xl grid w-[580px] grid-cols-2 gap-2 border bg-popover p-2 shadow-sm">
                {productLinks.map((item, i) => (
                  <LinkItem key={`item-${item.label}-${i}`} {...item} className="rounded-lg hover:bg-accent/50 transition-colors" />
                ))}
              </div>
              <div className="px-3 py-2">
                <p className="text-muted-foreground text-sm">
                  Interested?{" "}
                  <a className="font-medium text-foreground hover:underline underline-offset-4" href="#">
                    Schedule a demo
                  </a>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative">
        <Button
          variant="ghost"
          className="bg-transparent data-[state=open]:bg-accent"
          data-state={openMenu === "company" ? "open" : "closed"}
          onClick={() => setOpenMenu(openMenu === "company" ? null : "company")}
        >
          Company
        </Button>
        <AnimatePresence>
          {openMenu === "company" && (
            <motion.div
              initial={{opacity: 0, y: 6, scale: 0.98}}
              animate={{opacity: 1, y: 0, scale: 1}}
              exit={{opacity: 0, y: 6, scale: 0.98}}
              transition={{duration: 0.18, ease: [0.16, 1, 0.3, 1]}}
              className="absolute top-full left-0 mt-2 p-1.5 bg-popover/80 backdrop-blur-md rounded-xl shadow-xl ring-1 ring-border z-50 overflow-hidden"
            >
              <div className="grid w-[580px] grid-cols-2 gap-2">
                <div className="rounded-xl space-y-2 border bg-popover p-2 shadow-sm">
                  {companyLinks.map((item, i) => (
                    <LinkItem key={`item-${item.label}-${i}`} {...item} className="rounded-lg hover:bg-accent/50 transition-colors" />
                  ))}
                </div>
                <div className="space-y-1 p-2">
                  {companyLinks2.map((item, i) => (
                    <a
                      key={`item-${item.label}-${i}`}
                      href={item.href}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
                        {item.icon}
                      </span>
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <a className="rounded-md px-4 py-2 text-sm hover:bg-accent" href="#">
        Pricing
      </a>
    </nav>
  );
}
