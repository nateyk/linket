import {AdminSettings} from '@common/admin/settings/admin-settings';
import {settingsFormId} from '@common/admin/settings/layout/settings-constants';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {
  SettingsPageStoreProvider,
  useSettingsPageStore,
} from '@common/admin/settings/layout/settings-page-store';
import {updateSettingsOptions} from '@common/admin/settings/settings-queries';
import {useAdminSettingsPageNavConfig} from '@common/admin/settings/use-admin-settings-page-nav-config';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useIsMutating, useMutation} from '@tanstack/react-query';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {BlockerDialog} from '@ui/overlays/dialog/blocker-dialog';
import {cn} from '@ui/utils/cn';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';
import {isAbsoluteUrl} from '@ui/utils/urls/is-absolute-url';
import {MenuIcon} from 'lucide-react';
import {Fragment, ReactElement, ReactNode, useEffect} from 'react';
import {UseFormReturn} from 'react-hook-form';
import {BlockerFunction, useLocation} from 'react-router';

interface Props {
  children: ReactNode;
  title: ReactElement<MessageDescriptor>;
  form: UseFormReturn<any>;
  tabs?: ReactElement;
  docsLink?: string;
  className?: string;
}
export function AdminSettingsLayout({
  title,
  form,
  children,
  tabs,
  docsLink,
  className,
}: Props) {
  return (
    <SettingsPageStoreProvider>
      <DashboardLayout.MainSection className="relative">
        <SettingsPageHeader title={title} tabs={tabs} docsLink={docsLink} />
        <div className="flex-auto overflow-y-auto">
          <div
            className={cn(
              '@container/settings-form mx-auto p-3 md:p-6 lg:max-w-360',
              className,
            )}
          >
            <SettingsForm form={form}>{children}</SettingsForm>
          </div>
        </div>
      </DashboardLayout.MainSection>
    </SettingsPageStoreProvider>
  );
}

interface SettingsPageHeaderProps {
  title: ReactElement<MessageDescriptor>;
  className?: string;
  tabs?: ReactElement;
  allowNavigation?: BlockerFunction;
  docsLink?: string;
}
export function SettingsPageHeader({
  title,
  className,
  tabs,
  allowNavigation,
  docsLink,
}: SettingsPageHeaderProps) {
  const isDirty = useSettingsPageStore(s => s.isDirty);
  const isMobile = useIsMobileMediaQuery();
  const isPending =
    useIsMutating({
      mutationKey: ['submitAdminSettings'],
    }) > 0;

  const submitButton = (
    <Button
      type="submit"
      form={settingsFormId}
      color="primary"
      size="sm"
      disabled={isPending || !isDirty}
      className="min-w-21"
    >
      {isMobile ? <Trans message="Save" /> : <Trans message="Save changes" />}
    </Button>
  );

  return (
    <Fragment>
      <DashboardLayout.SectionHeader
        className={cn(tabs && 'border-none', className)}
      >
        {isMobile && <DashboardLayout.SidebarToggle />}
        <DashboardLayout.SectionTitle>{title}</DashboardLayout.SectionTitle>
        {isMobile && <SettingsMobileNav />}
        {docsLink ? (
          <DocsLink
            link={docsLink}
            variant="button"
            buttonVariant={isMobile ? 'icon' : 'text'}
          >
            <Trans message="Learn more" />
          </DocsLink>
        ) : null}
        {submitButton}
      </DashboardLayout.SectionHeader>
      {tabs}
      <BlockerDialog shouldBlock={isDirty} allowNavigation={allowNavigation} />
    </Fragment>
  );
}

interface SettingsFormProps {
  form: UseFormReturn<AdminSettings>;
  children: ReactNode;
}
export function SettingsForm({form, children}: SettingsFormProps) {
  const setIsDirty = useSettingsPageStore(s => s.setIsDirty);
  const updateSettings = useMutation(updateSettingsOptions());

  useEffect(() => {
    setIsDirty(form.formState.isDirty);
    return () => setIsDirty(false);
  }, [form.formState.isDirty, setIsDirty]);

  const handleSubmit = (values: AdminSettings) => {
    updateSettings.mutate(values, {
      onSuccess: () => {
        toast.success(<Trans message="Settings updated" />);
        form.reset(values);
        // set not dirty on the same render, so there's no flash on submit button
        setIsDirty(false);
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <FileUploadProvider>
      <HookForm.Root
        id={settingsFormId}
        form={form}
        onSubmit={values => handleSubmit(values)}
      >
        {children}
      </HookForm.Root>
    </FileUploadProvider>
  );
}

export function SettingsMobileNav() {
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const value = pathname.split('/').pop();

  const navConfig = useAdminSettingsPageNavConfig();

  return (
    <Dropdown.Root>
      <Dropdown.Trigger render={<Button variant="outline" size="icon" />}>
        <MenuIcon />
      </Dropdown.Trigger>
      <Dropdown.Content>
        <Dropdown.RadioGroup
          value={value}
          onValueChange={newPage => {
            const path = !isAbsoluteUrl(newPage)
              ? `/admin/settings/${newPage}`
              : newPage;
            navigate(path, {state: {prevPath: pathname}});
          }}
        >
          {navConfig.map(item => (
            <Dropdown.RadioItem key={item.to} value={item.to}>
              <Trans {...item.label} />
            </Dropdown.RadioItem>
          ))}
        </Dropdown.RadioGroup>
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
