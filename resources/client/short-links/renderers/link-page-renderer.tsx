import {Link} from '@app/gen/schemas/link';
import {RedirectCountdownButton} from '@app/short-links/renderers/redirect-countdown-button';
import {AdHost} from '@common/admin/ads/ad-host';
import {CustomPageBody} from '@common/custom-page/custom-page-body';
import {Footer} from '@common/ui/footer/footer';
import {Navbar} from '@common/ui/navigation/navbar/navbar';

export function LinkPageRenderer({link}: {link: Link}) {
  const page = link.link_page!;
  return (
    <div className="flex min-h-screen flex-col">
      {!page.hide_navbar && <LinkPageNavbar link={link} />}
      <AdHost slot="link_page" className="mt-17.5 mb-5" />
      <div className="flex-auto">
        <CustomPageBody page={page} />
      </div>
      {!page.hide_footer && <Footer className="mx-3.5 md:mx-10" />}
    </div>
  );
}

interface LinkPageNavbarProps {
  link: Link;
}
function LinkPageNavbar({link}: LinkPageNavbarProps) {
  return (
    <Navbar.Root className="sticky top-0 z-10 border-b bg-background">
      <Navbar.Logo />
      <Navbar.Menu position="link-page-navbar" />
      <Navbar.Content>
        <RedirectCountdownButton
          variant="outline"
          color="primary"
          link={link}
        />
      </Navbar.Content>
      <Navbar.Content className="ml-auto">
        <Navbar.AuthContent />
      </Navbar.Content>
    </Navbar.Root>
  );
}
