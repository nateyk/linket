import {LocaleSwitcher} from '@common/locale-switcher/locale-switcher';
import {Trans} from '@ui/i18n/trans';
import {removeFromLocalStorage} from '@ui/utils/hooks/local-storage';
import {Fragment, ReactElement, useEffect} from 'react';
import {UnstyledCustomMenuItem} from '@common/menus/custom-menu';
import {useCustomMenu} from '@common/menus/use-custom-menu';
import {StaticPageTitle} from '../../seo/static-page-title';
import {Navbar} from '../../ui/navigation/navbar/navbar';

interface CheckoutLayoutProps {
  children: [ReactElement, ReactElement];
}
export function CheckoutLayout({children}: CheckoutLayoutProps) {
  const [left, right] = children;
  const footerMenu = useCustomMenu('checkout-page-footer');

  useEffect(() => {
    removeFromLocalStorage('be.onboarding.selected');
  }, []);

  return (
    <Fragment>
      <StaticPageTitle>
        <Trans message="Checkout" />
      </StaticPageTitle>

      <Navbar.Root className="z-10 mb-5 md:mb-0">
        <Navbar.Logo color="dark" />
        <Navbar.Menu position="checkout-page-navbar" />
        <Navbar.Content className="ml-auto">
          <Navbar.AuthContent />
        </Navbar.Content>
      </Navbar.Root>

      <div className="mx-auto w-full justify-between px-5 md:flex md:max-w-237.5 md:px-0 md:pt-32">
        <div className="fixed top-0 right-0 hidden h-full w-1/2 bg-muted shadow-[15px_0_30px_0_rgb(0_0_0/18%)] md:block" />
        <div className="overflow-hidden md:w-100">
          {left}
          {footerMenu && (
            <div
              className="mt-12.5 flex items-center gap-7.5 overflow-x-auto text-xs text-muted-foreground"
              data-menu-id={footerMenu.id}
            >
              {footerMenu.items.map(item => (
                <UnstyledCustomMenuItem
                  key={item.id}
                  item={item}
                  className="hover:underline"
                />
              ))}
            </div>
          )}
          <div className="mt-10">
            <LocaleSwitcher />
          </div>
        </div>
        <div className="hidden w-96 md:block">
          <div className="relative z-10">{right}</div>
        </div>
      </div>
    </Fragment>
  );
}
