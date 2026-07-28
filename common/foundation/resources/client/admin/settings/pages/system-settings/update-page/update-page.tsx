import {AdminDocsUrls} from '@app/admin/admin-config';
import {UpdateEventMessage} from '@common/admin/settings/pages/system-settings/update-page/update-event-message';
import {
  UpdaterContext,
  UpdaterContextProvider,
} from '@common/admin/settings/pages/system-settings/update-page/updater-context-provider';
import {
  UpdateStep,
  UpdateStepStatus,
} from '@common/admin/settings/pages/system-settings/update-page/updater-types';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Button, LinkButton} from '@shadcn/button/button';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {BlockerDialog} from '@ui/overlays/dialog/blocker-dialog';
import {ucFirst} from '@ui/utils/string/uc-first';
import {ExternalLinkIcon, HardDriveDownloadIcon} from 'lucide-react';
import {ReactElement, ReactNode, use} from 'react';

type Props = {
  tabs: ReactElement;
  title: ReactElement<MessageDescriptor>;
  rightContent?: ReactNode;
};
export function UpdatePage(props: Props) {
  return (
    <UpdaterContextProvider>
      <Content {...props} />
    </UpdaterContextProvider>
  );
}

function Content({tabs, title, rightContent}: Props) {
  const {updateStarted} = use(UpdaterContext);
  const {isMobileMode} = use(DashboardLayoutContext);
  const content = updateStarted ? <ActiveUpdatePanel /> : <WelcomePanel />;

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader className="border-none">
        {isMobileMode && <DashboardLayout.SidebarToggle />}
        <DashboardLayout.SectionTitle render={<h1 />}>
          {title}
        </DashboardLayout.SectionTitle>
        {rightContent}
      </DashboardLayout.SectionHeader>
      {tabs}
      <div className="overflow-y-auto">
        <div className="@container/settings-form mx-auto p-3 md:p-6 lg:max-w-360">
          {content}
        </div>
      </div>
    </DashboardLayout.MainSection>
  );
}

type UpdatePanelProps = {
  children: ReactNode;
};
function UpdatePanel({children}: UpdatePanelProps) {
  const {data} = useAdminSettings();
  const alreadyOnLatestVersion = !data?.update_available;
  return (
    <div className="rounded-card border p-6 shadow-xs">
      <div className="text-center">
        <HardDriveDownloadIcon className="inline-block size-10" />
        <h1 className="mt-3 mb-1 text-xl font-semibold">
          {alreadyOnLatestVersion ? (
            <Trans message="You already have the latest version installed" />
          ) : (
            <Trans message="System update" />
          )}
        </h1>
        <p className="text-muted-foreground">
          <Trans message="Update your system to the latest version. This will download and install updates automatically, please do not close this page while update is in progress." />
        </p>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function WelcomePanel() {
  const {updateAppAndModules} = use(UpdaterContext);
  const {data} = useAdminSettings();
  const alreadyOnLatestVersion = !data?.update_available;
  return (
    <UpdatePanel>
      <div className="w-full text-center">
        <Button
          variant="default"
          color="primary"
          onClick={async () => {
            const success = await updateAppAndModules();
            if (success) {
              setTimeout(() => {
                window.location.href = '/admin/settings';
              }, 1000);
            }
          }}
        >
          {alreadyOnLatestVersion ? (
            <Trans
              message="Re-install version :version"
              values={{version: data?.server?.app_version}}
            />
          ) : (
            <Trans message="Start Update" />
          )}
        </Button>
      </div>
    </UpdatePanel>
  );
}

function ActiveUpdatePanel() {
  const {
    events,
    updateInProgress,
    updateAppAndModules,
    moduleNames,
    activeModuleName,
  } = use(UpdaterContext);
  const lastEvent = events.at(-1);

  return (
    <div>
      <BlockerDialog shouldBlock={updateInProgress} />
      <UpdatePanel>
        <div className="border-t border-t-border/80 pt-6">
          {moduleNames?.length && activeModuleName ? (
            <div className="mb-5 font-semibold">
              <Trans message="Updating" />:{' '}
              <ModuleDisplayName name={activeModuleName} />
            </div>
          ) : null}
          <div className="space-y-4.5">
            {events.map((event, index) => (
              <UpdateEventMessage event={event} key={index} />
            ))}
          </div>
          {lastEvent?.context?.error ? (
            <div className="mt-6 flex items-center gap-3">
              <Button
                variant="default"
                color="primary"
                onClick={() => updateAppAndModules()}
              >
                <Trans message="Retry" />
              </Button>
              <LinkButton
                variant="default"
                color="primary"
                to={AdminDocsUrls.manualUpdate}
                target="_blank"
              >
                <Trans message="Update manually" />
                <ExternalLinkIcon data-icon="inline-end" />
              </LinkButton>
            </div>
          ) : null}
          {lastEvent?.step === UpdateStep.Finalizing &&
          lastEvent?.status === UpdateStepStatus.Completed ? (
            <div className="mt-6">
              <div className="mb-3 text-muted-foreground">
                <Trans message="Update completed successfully! Reloading the page..." />
              </div>
              <LinkButton variant="default" color="primary" to="/admin">
                <Trans message="Return to admin area" />
              </LinkButton>
            </div>
          ) : null}
        </div>
      </UpdatePanel>
    </div>
  );
}

type ModuleDisplayNameProps = {
  name: string;
};
function ModuleDisplayName({name}: ModuleDisplayNameProps) {
  const {data} = useAdminSettings();
  if (name === 'app') {
    return <Trans message="Application" />;
  }
  return <span>{data.modules?.[name]?.label ?? ucFirst(name)}</span>;
}
