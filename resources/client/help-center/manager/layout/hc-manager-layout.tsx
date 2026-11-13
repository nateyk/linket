import {useHcManagerBasePath} from '@app/help-center/manager/hc-manager-paths';
import {
  DatatablePageHeaderBar,
  DatatablePageScrollContainer,
  DatatablePageWithHeaderBody,
  DatatablePageWithHeaderLayout,
} from '@common/datatable/page/datatable-page-with-header-layout';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {Button} from '@ui/buttons/button';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {SettingsIcon} from 'lucide-react';
import {Fragment, ReactNode} from 'react';
import {Link} from 'react-router';
import {HcManagerTabs} from '@app/help-center/manager/layout/hc-manager-tabs';

interface Props {
  actionButton?: ReactNode;
  children: ReactNode;
  title: ReactNode;
}
export function HcManagerLayout({actionButton, children, title}: Props) {
  const isAdmin = useHcManagerBasePath() === '/admin/help';
  const {trans} = useTrans();
  return (
    <DatatablePageWithHeaderLayout>
      <StaticPageTitle>
        <Trans message="Help center" />
      </StaticPageTitle>
      <DatatablePageHeaderBar
        title={title}
        showSidebarToggleButton
        border="border-none"
        rightContent={
          <Fragment>
            {isAdmin && (
              <Button
                variant="outline"
                size="xs"
                elementType={Link}
                to="/admin/settings/hc"
                aria-label={trans({message: 'Help center settings'})}
                className="min-w-8 gap-1 px-2 sm:px-3"
              >
                <SettingsIcon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline"><Trans message="Settings" /></span>
              </Button>
            )}
            {actionButton}
          </Fragment>
        }
      />
      <HcManagerTabs />
      <DatatablePageWithHeaderBody>
        <DatatablePageScrollContainer>{children}</DatatablePageScrollContainer>
      </DatatablePageWithHeaderBody>
    </DatatablePageWithHeaderLayout>
  );
}
