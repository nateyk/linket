import {SettingsMobileNav} from '@common/admin/settings/layout/settings-layout';
import {DatatablePageHeaderBar} from '@common/datatable/page/datatable-page-with-header-layout';
import {Button} from '@ui/buttons/button';
import {Trans} from '@ui/i18n/trans';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';
import {ReactElement, ReactNode} from 'react';

type Props = {
  title: ReactNode;
  description: ReactNode;
  icon: ReactElement;
  getModuleLink: string;
  getModuleLabel: ReactNode;
};
export function InstallModuleCard({
  title,
  description,
  icon,
  getModuleLink,
  getModuleLabel,
}: Props) {
  const isMobile = useIsMobileMediaQuery();
  return (
    <div className="dashboard-grid-content dashboard-rounded-panel relative flex flex-auto flex-col">
      <DatatablePageHeaderBar
        showSidebarToggleButton={!!isMobile}
        title={<Trans message="Livechat" />}
        rightContent={isMobile && <SettingsMobileNav />}
      />
      <div className="p-24">
        <div className="max-w-680 rounded-panel border p-24 shadow">
          <div className="mb-24">{icon}</div>
          <div className="mb-10 text-base font-medium">{title}</div>
          <div className="text-sm text-muted">{description}</div>
          <div className="mt-24">
            <Button
              variant="raised"
              color="primary"
              elementType="a"
              href={getModuleLink}
              target="_blank"
            >
              {getModuleLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
