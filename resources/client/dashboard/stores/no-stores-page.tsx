import {CreateBiolinkDialog} from '@app/dashboard/stores/store-editor/create-biolink-dialog';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Trans} from '@ui/i18n/trans';
import {LayoutPanelTop, PlusIcon} from 'lucide-react';

export function Component() {
  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <h1 className="text-2xl leading-8 font-semibold tracking-tight">
          <Trans message="Stores" />
        </h1>
      </DashboardLayout.SectionHeader>

      <Empty.Root>
        <Empty.Header className="max-w-md">
          <Empty.Media variant="icon">
            <LayoutPanelTop />
          </Empty.Media>
          <Empty.Title>
            <Trans message="No stores yet" />
          </Empty.Title>
          <Empty.Description>
            <Trans message="This workspace has no stores yet. Create one to get started." />
          </Empty.Description>
        </Empty.Header>
        <Empty.Content>
          <CreateBiolinkDialog>
            <Dialog.Trigger
              render={<Button variant="default" color="primary" />}
            >
              <PlusIcon />
              <Trans message="Create store" />
            </Dialog.Trigger>
          </CreateBiolinkDialog>
        </Empty.Content>
      </Empty.Root>
    </DashboardLayout.MainSection>
  );
}
