import {retrieveCustomPageOptions} from '@common/admin/custom-pages/custom-pages-queries';
import {CustomPageBody} from '@common/custom-page/custom-page-body';
import {PageMetaTags} from '@common/http/page-meta-tags';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useSuspenseQuery} from '@tanstack/react-query';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {Footer} from '../ui/footer/footer';
import {Navbar} from '../ui/navigation/navbar/navbar';

export function Component() {
  const {pageSlug} = useRequiredParams(['pageSlug']);
  const query = useSuspenseQuery({
    ...retrieveCustomPageOptions(pageSlug),
    initialData: () => {
      const data = getBootstrapData().loaders?.customPage;
      if (data?.data && data.data.slug === pageSlug) {
        return data;
      }
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageMetaTags query={query} />

      <Navbar.Root className="sticky top-0 z-10 border-b bg-background">
        <Navbar.Logo />
        <Navbar.Menu position="custom-page-navbar" />
        <Navbar.Content className="ml-auto">
          <Navbar.AuthContent />
        </Navbar.Content>
      </Navbar.Root>

      <div className="flex-auto">
        <CustomPageBody page={query.data.data} />
      </div>
      <Footer className="mx-3.5 md:mx-10" />
    </div>
  );
}
