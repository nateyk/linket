import {ShareLinkButton} from '@app/dashboard/links/sharing/share-link-button';
import {Link} from '@app/gen/schemas/link';
import {RedirectCountdownButton} from '@app/short-links/renderers/redirect-countdown-button';
import {AdHost} from '@common/admin/ads/ad-host';
import {Footer} from '@common/ui/footer/footer';
import {Navbar} from '@common/ui/navigation/navbar/navbar';
import {LinkButton} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {EyeIcon} from 'lucide-react';
import {useState} from 'react';

export function LinkSplashRenderer({link}: {link: Link}) {
  const {base_url} = useSettings();
  const [imageError, setImageError] = useState(false);
  return (
    <div className="flex h-screen w-full flex-col bg-muted">
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

      <div className="mx-auto flex max-w-6xl flex-auto flex-col items-center justify-center px-6">
        <AdHost slot="splash_top" className="mt-5 mb-15 shrink-0" />
        <div className="shrink-0 gap-8.5 rounded-card border bg-background p-5 md:flex">
          <div className="flex h-60 w-80 max-w-full shrink-0 items-center justify-center rounded-card border bg-muted/50">
            {imageError ? (
              <EyeIcon className="size-10 text-muted-foreground" />
            ) : (
              <img
                src={`${base_url}/${link.back_half}/img`}
                alt=""
                className="max-h-full max-w-full rounded-card object-contain"
                onError={() => setImageError(true)}
              />
            )}
          </div>
          <div>
            <h1 className="mt-6 mb-6 text-2xl md:mt-0">
              <Trans message="You are about to be redirected to another page." />
            </h1>
            <div>
              <RedirectCountdownButton
                variant="default"
                color="primary"
                link={link}
              />
              <LinkButton variant="ghost" className="ml-2.5" to="/">
                <Trans message="Go back" />
              </LinkButton>
            </div>
            <div className="mt-6 border-t pt-6 text-sm text-muted-foreground">
              <Trans message="You are about to be redirected to another page. We are not responsible for the content of that page or the consequences it may have on you." />
            </div>
          </div>
        </div>
        <AdHost slot="splash_bottom" className="mt-15 mb-5 shrink-0" />
      </div>

      <Footer className="px-6" />
    </div>
  );
}
