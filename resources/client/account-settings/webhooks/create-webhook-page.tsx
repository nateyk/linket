import {
  CrupdateWebhookFields,
  CrupdateWebhookFormValues,
  webhookFormValueToPayload,
} from '@app/account-settings/webhooks/crupdate-webhook-fields';
import {createWebhookOptions} from '@app/account-settings/webhooks/webhook-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {nanoid} from 'nanoid';
import {useMemo} from 'react';
import {useForm} from 'react-hook-form';

export function Component() {
  const signingSecret = useMemo(() => `whsec_${nanoid(32)}`, []);
  const form = useForm<CrupdateWebhookFormValues>({
    defaultValues: {
      name: '',
      url: '',
      signing_secret: signingSecret,
    },
  });
  const createWebhook = useMutation(createWebhookOptions());
  const navigate = useNavigate();

  const handleSubmit = (values: CrupdateWebhookFormValues) => {
    createWebhook.mutate(webhookFormValueToPayload(values), {
      onSuccess: () => {
        toast.success(<Trans message="Webhook created" />);
        navigate('/account-settings/webhooks');
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <DashboardLayout.MainSection
      render={<HookForm.Root form={form} onSubmit={handleSubmit} />}
    >
      <StaticPageTitle>
        <Trans message="New webhook" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <Breadcrumb.Root className="text-xl">
          <Breadcrumb.Item>
            <Breadcrumb.Link to="/account-settings/webhooks">
              <Trans message="Webhooks" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>
              <Trans message="New" />
            </Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.Root>
        <Button
          variant="default"
          color="primary"
          type="submit"
          disabled={createWebhook.isPending}
        >
          <Trans message="Create webhook" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.ContainedContent className="max-w-5xl">
          <CrupdateWebhookFields />
        </DashboardLayout.ContainedContent>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
