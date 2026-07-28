import {AdminDocsUrls} from '@app/admin/admin-config';
import {registerPurchaseCode} from '@app/gen/license';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
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
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {message} from '@ui/i18n/message';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {OpenInNewIcon} from '@ui/icons/material/OpenInNew';
import {BlockerDialog} from '@ui/overlays/dialog/blocker-dialog';
import {toast} from '@ui/toast/toast';
import {ReactElement, ReactNode, use, useState} from 'react';
import {flushSync} from 'react-dom';
import {useForm} from 'react-hook-form';

type FormValue = {
  purchase_code: string;
};

type Props = {
  tabs: ReactElement;
  title: ReactElement<MessageDescriptor>;
  rightContent?: ReactNode;
};
export function LicensePage({tabs, title, rightContent}: Props) {
  const {isMobileMode} = use(DashboardLayoutContext);
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
          <LicensePanel />
          <ModulePanels />
        </div>
      </div>
    </DashboardLayout.MainSection>
  );
}

function LicensePanel() {
  const {trans} = useTrans();
  const {data} = useAdminSettings();
  const [activatedPurchaseCode, setActivatedPurchaseCode] = useState(
    data.license?.purchase_code ?? '',
  );

  const form = useForm<FormValue>({
    defaultValues: {
      purchase_code: activatedPurchaseCode ?? '',
    },
  });

  const [isPending, setIsPending] = useState(false);
  const handleSubmit = async (values: FormValue) => {
    setIsPending(true);

    let code: string | undefined;

    try {
      code = (
        await registerPurchaseCode({
          purchase_code: values.purchase_code,
        })
      ).purchase_code;
    } catch (error) {
      onFormQueryError(error, form);
    }

    setIsPending(false);
    if (code) {
      toast(message('Purchase code activated'));
      setActivatedPurchaseCode(code);
    }
  };

  return (
    <SettingsPanel
      title={<Trans message="Envato purchase code" />}
      description={
        <Trans message="Activate your license to enable automatic updates and other functionality." />
      }
      link={
        <a
          className="cursor-pointer text-sm text-primary hover:underline"
          href={AdminDocsUrls.settings.purchaseCode}
          target="_blank"
        >
          <Trans message="Where is my purchase code?" />
        </a>
      }
    >
      <HookForm.Root form={form} onSubmit={values => handleSubmit(values)}>
        <PurchaseCodeField
          activated={!!activatedPurchaseCode}
          placeholder={trans(
            message('Example: :code', {
              values: {code: '91939276-b234-49d1-ac42-6c7xe5t7a128'},
            }),
          )}
        />
        <Button
          color="primary"
          type="submit"
          size="sm"
          disabled={isPending}
          className="mt-4"
        >
          <Trans message="Activate purchase code" />
        </Button>
      </HookForm.Root>
    </SettingsPanel>
  );
}

function ModulePanels() {
  const {data} = useAdminSettings();

  if (!data.modules || !Object.keys(data.modules).length) {
    return null;
  }

  return (
    <div>
      <h2 className="mt-11 mb-3 text-lg font-semibold">
        <Trans message="Addon purchase codes" />
      </h2>
      <div className="flex flex-col gap-3">
        {Object.entries(data.modules)
          .filter(([, module]) => !module.built_in)
          .map(([key, module]) => (
            <UpdaterContextProvider key={key}>
              <ModulePanel name={key} config={module} />
            </UpdaterContextProvider>
          ))}
      </div>
    </div>
  );
}

type ModulePanelProps = {
  name: string;
  config: NonNullable<AdminSettings['modules']>[string];
};
function ModulePanel({config, name}: ModulePanelProps) {
  const {trans} = useTrans();
  const {data} = useAdminSettings();
  const envatoItemId = data.modules?.[name]?.envato_item_id;
  const {updateOrInstallModule} = use(UpdaterContext);
  const [installed, setInstalled] = useState(config.installed);
  const [activatedPurchaseCode, setActivatedPurchaseCode] = useState(
    config.envato_purchase_code,
  );
  const form = useForm<FormValue>({
    defaultValues: {
      purchase_code: activatedPurchaseCode ?? '',
    },
  });

  const handleModuleInstall = async () => {
    const success = await updateOrInstallModule(name);
    if (success) {
      flushSync(() => {
        setIsPending(false);
        setInstalled(true);
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      toast.danger(message('Failed to install module'));
    }
  };

  const [isPending, setIsPending] = useState(false);
  const handleSubmit = async (values: FormValue) => {
    setIsPending(true);

    let code: string | undefined;
    try {
      code = (
        await registerPurchaseCode({
          purchase_code: values.purchase_code,
          module: name,
        })
      ).purchase_code;
    } catch (error) {
      onFormQueryError(error, form);
    }

    if (code) {
      setActivatedPurchaseCode(code);
      // no need to show this toast if we will be installing the module
      if (installed) {
        toast(message('Purchase code activated'));
      } else {
        handleModuleInstall();
      }
    }

    setIsPending(false);
  };

  return (
    <SettingsPanel
      id={`module-${name}`}
      title={config.label}
      description={
        <Trans message="Enter purchase code to install this addon." />
      }
      link={
        <a
          className="flex cursor-pointer items-center gap-1 text-sm text-primary hover:underline"
          href={`https://codecanyon.net/item/i/${envatoItemId}`}
          target="_blank"
        >
          <Trans message="Get this addon" />
          <OpenInNewIcon className="size-4" />
        </a>
      }
    >
      {isPending ? <BlockerDialog shouldBlock /> : null}
      <HookForm.Root form={form} onSubmit={values => handleSubmit(values)}>
        <PurchaseCodeField
          activated={!!activatedPurchaseCode}
          placeholder={trans(
            message('Example: :code', {
              values: {code: '91939276-b234-49d1-ac42-6c7xe5t7a128'},
            }),
          )}
        />
        <Button
          color="primary"
          type="submit"
          className="mt-4"
          size="sm"
          disabled={isPending}
        >
          {installed ? (
            <Trans message="Activate" />
          ) : (
            <Trans message="Activate and install" />
          )}
        </Button>
      </HookForm.Root>
      <ModuleInstallProgress
        onRetry={() => handleModuleInstall()}
        className="mt-6 rounded-card border p-4"
      />
    </SettingsPanel>
  );
}

type PurchaseCodeFieldProps = {
  activated: boolean;
  placeholder: string;
};
function PurchaseCodeField({activated, placeholder}: PurchaseCodeFieldProps) {
  return (
    <HookForm.Field name="purchase_code">
      <Field.Label className="sr-only">
        <Trans message="Envato purchase code" />
      </Field.Label>
      <InputGroup>
        <InputGroupInput placeholder={placeholder} required />
        <InputGroupAddon align="inline-end">
          <Badge variant={activated ? 'positive' : 'destructive'}>
            {activated ? (
              <Trans message="ACTIVATED" />
            ) : (
              <Trans message="NOT ACTIVATED" />
            )}
          </Badge>
        </InputGroupAddon>
      </InputGroup>
      <Field.Error />
    </HookForm.Field>
  );
}

type ModuleInstallProgressProps = {
  onRetry: () => void;
  className?: string;
};
export function ModuleInstallProgress({
  onRetry,
  className,
}: ModuleInstallProgressProps) {
  const {events, updateInProgress} = use(UpdaterContext);
  const lastEvent = events.at(-1);

  if (!events.length && !updateInProgress) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-4.5">
        {events.map((event, index) => (
          <UpdateEventMessage event={event} key={index} />
        ))}
      </div>
      {lastEvent?.context?.error ? (
        <div className="mt-6 flex items-center gap-3">
          <Button color="primary" onClick={() => onRetry()}>
            <Trans message="Retry" />
          </Button>
          <Button variant="outline" color="primary">
            <Trans message="Update manually" />
            <OpenInNewIcon />
          </Button>
        </div>
      ) : null}
      {lastEvent?.step === UpdateStep.Finalizing &&
      lastEvent?.status === UpdateStepStatus.Completed ? (
        <div className="mt-6 text-muted-foreground">
          <Trans message="Module installed successfully! Reloading the page..." />
        </div>
      ) : null}
    </div>
  );
}
