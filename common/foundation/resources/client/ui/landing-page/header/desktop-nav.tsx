import {Button} from "@shadcn/button/button";
import {LinkItem} from "./sheard";
import {companyLinks, companyLinks2, productLinks} from "./nav-links";
import {useState} from "react";

export function DesktopNav() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <nav className="hidden md:flex items-center gap-1">
      <div className="relative">
        <Button
          variant="ghost"
          className="bg-transparent"
          onClick={() => setOpenMenu(openMenu === "product" ? null : "product")}
        >
          Product
        </Button>
        {openMenu === "product" && (
          <div className="absolute top-full left-0 mt-1 p-1 pr-1.5 bg-muted/50 dark:bg-background rounded-md shadow-lg z-50">
            <div className="rounded-lg grid w-[560px] grid-cols-2 gap-2 border bg-popover p-2 shadow">
              {productLinks.map((item, i) => (
                <LinkItem key={`item-${item.label}-${i}`} {...item} />
              ))}
            </div>
            <div className="p-2">
              <p className="text-muted-foreground text-sm">
                Interested?{" "}
                <a className="font-medium text-foreground hover:underline" href="#">
                  Schedule a demo
                </a>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <Button
          variant="ghost"
          className="bg-transparent"
          onClick={() => setOpenMenu(openMenu === "company" ? null : "company")}
        >
          Company
        </Button>
        {openMenu === "company" && (
          <div className="absolute top-full left-0 mt-1 p-1 pr-1.5 pb-1.5 bg-muted/50 dark:bg-background rounded-md shadow-lg z-50">
            <div className="grid w-[560px] grid-cols-2 gap-2">
              <div className="rounded-lg space-y-2 border bg-popover p-2 shadow">
                {companyLinks.map((item, i) => (
                  <LinkItem key={`item-${item.label}-${i}`} {...item} className="rounded-sm" />
                ))}
              </div>
              <div className="space-y-2 p-3">
                {companyLinks2.map((item, i) => (
                  <a
                    key={`item-${item.label}-${i}`}
                    href={item.href}
                    className="flex items-center gap-2 text-sm hover:underline"
                  >
                    {item.icon}
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <a className="rounded-md px-4 py-2 text-sm hover:bg-accent" href="#">
        Pricing
      </a>
    </nav>
  );
}
