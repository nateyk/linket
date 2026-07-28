import {Link} from '@app/gen/schemas/link';
import {FloatingLinkOverlay} from '@app/short-links/floating-link-overlay';
import {AdHost} from '@common/admin/ads/ad-host';

export function LinkOverlayRenderer({link}: {link: Link}) {
  return (
    <div className="relative flex h-screen flex-col">
      <AdHost slot="frame" className="my-5" />
      {link.overlay && <FloatingLinkOverlay overlay={link.overlay} />}
      <iframe
        src={link.final_destination_url ?? link.long_url}
        className="flex-auto"
      />
    </div>
  );
}
