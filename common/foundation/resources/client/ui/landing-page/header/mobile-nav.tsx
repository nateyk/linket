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
          <Drawer.Body className="p-4">
            <div className="flex w-full flex-col gap-y-4">
              <div>
                <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Product</span>
                <div className="mt-2 flex flex-col gap-1">
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
              </div>
              <div>
                <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Company</span>
                <div className="mt-2 flex flex-col gap-1">
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
              </div>
            </div>
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
