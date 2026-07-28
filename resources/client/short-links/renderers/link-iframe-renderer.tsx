import {ShareLinkButton} from '@app/dashboard/links/sharing/share-link-button';
import {Link} from '@app/gen/schemas/link';
import {AdHost} from '@common/admin/ads/ad-host';
import {Navbar} from '@common/ui/navigation/navbar/navbar';

export function LinkIframeRenderer({link}: {link: Link}) {
  return (
    <div className="relative flex h-screen flex-col">
      <Navbar.Root className="sticky top-0 z-10 border-b bg-background">
        <Navbar.Logo />
        <Navbar.Menu position="link-page-navbar" />
        <Navbar.Content className="ml-auto">
          <ShareLinkButton
            url={link.short_url}
            longUrl={link.final_destination_url}
          />
          <Navbar.AuthContent />
        </Navbar.Content>
      </Navbar.Root>

      <AdHost slot="frame" className="my-5" />

      <iframe
        src={link.final_destination_url ?? link.long_url}
        className="flex-auto"
      />
    </div>
  );
}
