import {retrieveLinkPageOptions} from '@app/dashboard/link-pages/link-pages-queries';
import {CustomPageBody} from '@common/custom-page/custom-page-body';
import {Footer} from '@common/ui/footer/footer';
import {Navbar} from '@common/ui/navigation/navbar/navbar';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Button} from '@shadcn/button/button';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {Share2Icon} from 'lucide-react';

export function Component() {
  const {pageId} = useRequiredParams(['pageId']);
  const query = useSuspenseQuery(retrieveLinkPageOptions(Number(pageId)));
  const page = query.data.data;

  return (
    <div className="flex min-h-screen flex-col">
      {!page.hide_navbar && (
        <Navbar.Root className="sticky top-0 shrink-0">
          <Navbar.Logo />
          <Navbar.Content className="ml-auto">
            <Button>
              <Share2Icon data-icon="inline-start" />
              <Trans message="Share" />
            </Button>
          </Navbar.Content>
        </Navbar.Root>
      )}
      <div className="flex-auto">
        <CustomPageBody page={page} />
      </div>
      {!page.hide_footer && <Footer className="mx-3.5 md:mx-10" />}
    </div>
  );
}
