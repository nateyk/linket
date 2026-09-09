import {Accordion} from "@shadcn/accordion/accordion";
import {Button} from "@shadcn/button/button";
import {Drawer} from "@shadcn/drawer/drawer";
import {companyLinks, companyLinks2, productLinks} from "./nav-links";
import {LinkItem} from "./sheard";
import {MenuIcon} from "lucide-react";
import {Link} from "react-router";

export function MobileNav() {
  return (
    <Drawer.Root position="right">
      <Drawer.Trigger
        render={
          <Button
            aria-label="Toggle menu"
            size="icon"
            variant="outline"
            className="md:hidden"
          >
            <MenuIcon />
          </Button>
        }
      />
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Content className="flex flex-col p-0" popupClassName="p-0 sm:max-w-sm w-[85vw] max-w-[85vw]">
          <Drawer.Header className="p-6 pb-2 border-b">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                <span className="text-sm font-bold">B</span>
              </div>
              <span className="font-semibold">BELINK</span>
            </div>
            <Drawer.Title className="sr-only">Navigation Menu</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="p-0 overflow-y-auto">
            <Accordion className="w-full">
              <Accordion.Item value="product" className="border-b-0">
                <Accordion.Trigger className="px-6 py-4 text-sm font-medium hover:bg-accent/50">
                  Product
                </Accordion.Trigger>
                <Accordion.Content className="px-3 pb-3">
                  <div className="flex flex-col gap-1">
                    {productLinks.map((link) => (
                      <Drawer.Close
                        key={`product-${link.label}`}
                        render={
                          <LinkItem
                            className="rounded-xl p-3 hover:bg-accent active:bg-accent transition-colors border border-transparent hover:border-border/50"
                            {...link}
                          />
                        }
                      />
                    ))}
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              <Accordion.Item value="company" className="border-b-0">
                <Accordion.Trigger className="px-6 py-4 text-sm font-medium hover:bg-accent/50">
                  Company
                </Accordion.Trigger>
                <Accordion.Content className="px-3 pb-3">
                  <div className="flex flex-col gap-1">
                    {companyLinks.map((link) => (
                      <Drawer.Close
                        key={`company-${link.label}`}
                        render={
                          <LinkItem
                            className="rounded-xl p-3 hover:bg-accent active:bg-accent transition-colors border border-transparent hover:border-border/50"
                            {...link}
                          />
                        }
                      />
                    ))}
                    {companyLinks2.map((link) => (
                      <Drawer.Close
                        key={`company2-${link.label}`}
                        render={
                          <LinkItem
                            className="rounded-xl p-3 hover:bg-accent active:bg-accent transition-colors border border-transparent hover:border-border/50"
                            {...link}
                          />
                        }
                      />
                    ))}
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              <div className="px-6 py-4 border-t">
                <Link
                  to="#"
                  className="flex w-full items-center rounded-xl px-3 py-3 text-sm font-medium hover:bg-accent transition-colors"
                >
                  Pricing
                </Link>
              </div>
            </Accordion>
          </Drawer.Body>
          <Drawer.Footer className="p-6 pt-4 border-t bg-muted/20">
            <Button
              className="w-full"
              variant="outline"
              size="lg"
              render={<Link to="/login" />}
            >
              Sign In
            </Button>
            <Button className="w-full shadow-sm" size="lg" render={<Link to="/register" />}>
              Get Started
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
