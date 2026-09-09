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
        <Drawer.Content className="flex flex-col" popupClassName="p-0">
          <Drawer.Header className="p-4 pb-0">
            <Drawer.Title className="sr-only">Navigation Menu</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="p-0">
            <Accordion className="w-full">
              <Accordion.Item value="product">
                <Accordion.Trigger>Product</Accordion.Trigger>
                <Accordion.Content>
                  <div className="flex flex-col gap-1 px-2">
                    {productLinks.map((link) => (
                      <Drawer.Close
                        key={`product-${link.label}`}
                        render={
                          <LinkItem
                            className="rounded-xl p-3 hover:bg-accent active:bg-accent transition-colors"
                            {...link}
                          />
                        }
                      />
                    ))}
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              <Accordion.Item value="company">
                <Accordion.Trigger>Company</Accordion.Trigger>
                <Accordion.Content>
                  <div className="flex flex-col gap-1 px-2">
                    {companyLinks.map((link) => (
                      <Drawer.Close
                        key={`company-${link.label}`}
                        render={
                          <LinkItem
                            className="rounded-xl p-3 hover:bg-accent active:bg-accent transition-colors"
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
                            className="rounded-xl p-3 hover:bg-accent active:bg-accent transition-colors"
                            {...link}
                          />
                        }
                      />
                    ))}
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              <div className="px-4 py-3">
                <Link
                  to="#"
                  className="flex w-full items-center rounded-md px-0 py-1 text-sm font-medium hover:text-accent-foreground"
                >
                  Pricing
                </Link>
              </div>
            </Accordion>
          </Drawer.Body>
          <Drawer.Footer className="p-4 pt-0">
            <Button
              className="w-full"
              variant="outline"
              render={<Link to="/login" />}
            >
              Sign In
            </Button>
            <Button className="w-full shadow-sm" render={<Link to="/register" />}>
              Get Started
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
