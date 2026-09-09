import {Accordion} from "@shadcn/accordion/accordion";
import {Button} from "@shadcn/button/button";
import {companyLinks, companyLinks2, productLinks} from "./nav-links";
import {LinkItem} from "./sheard";
import {MenuIcon, XIcon} from "lucide-react";
import {Link} from "react-router";
import {useState} from "react";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        aria-label="Toggle menu"
        size="icon"
        variant="outline"
        onClick={() => setOpen(!open)}
      >
        {open ? <XIcon /> : <MenuIcon />}
      </Button>

      {open && (
        <div className="fixed inset-0 top-14 z-40 flex flex-col bg-background">
          <div
            className="fixed inset-0 top-14 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full flex-col overflow-y-auto bg-background p-4">
            <Accordion className="w-full">
              <Accordion.Item value="product">
                <Accordion.Trigger className="px-4 py-3 text-base font-medium capitalize text-muted-foreground hover:no-underline">
                  Product
                </Accordion.Trigger>
                <Accordion.Content>
                  <div className="flex flex-col gap-1 px-2 pb-3">
                    {productLinks.map((link) => (
                      <LinkItem
                        key={`product-${link.label}`}
                        className="rounded-xl p-3 hover:bg-accent"
                        {...link}
                      />
                    ))}
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              <Accordion.Item value="company">
                <Accordion.Trigger className="px-4 py-3 text-base font-medium capitalize text-muted-foreground hover:no-underline">
                  Company
                </Accordion.Trigger>
                <Accordion.Content>
                  <div className="flex flex-col gap-1 px-2">
                    {companyLinks.map((link) => (
                      <LinkItem
                        key={`company-${link.label}`}
                        className="rounded-xl p-3 hover:bg-accent"
                        {...link}
                      />
                    ))}
                    {companyLinks2.map((link) => (
                      <LinkItem
                        key={`company2-${link.label}`}
                        className="rounded-xl p-3 hover:bg-accent"
                        {...link}
                      />
                    ))}
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>

            <a
              href="#"
              className="flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium text-muted-foreground hover:bg-accent"
            >
              Pricing
            </a>

            <div className="mt-5 grid grid-cols-2 gap-2 border-t pt-4">
              <Button variant="outline" className="w-full" render={<Link to="/login" />}>
                Login
              </Button>
              <Button className="w-full" render={<Link to="/register" />}>
                Book a Demo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
