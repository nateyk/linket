import {createProductOptions} from '@common/admin/subscriptions/products-queries';
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
import {useForm} from 'react-hook-form';
import {CrupdatePlanForm, CrupdatePlanFormValues} from './crupdate-plan-form';

export function Component() {
  const navigate = useNavigate();
  const form = useForm<CrupdatePlanFormValues>({
    defaultValues: {
      free: false,
      recommended: false,
      active: true,
      is_default: false,
      storefront_benefits: {
        platform_fee_percent: 5,
        max_free_products: 5,
        max_paid_products: 5,
        max_upload_bytes: 1073741824,
        max_storefronts: 1,
        max_workspaces: 1,
        tracking_pixels_enabled: false,
      },
      trial_period_days: 0,
      position: 0,
      feature_list: [],
    },
  });
  const createProduct = useMutation(createProductOptions());

  const handleSubmit = (values: CrupdatePlanFormValues) => {
    const payload = {
      ...values,
      feature_list: values.feature_list.map(f => f.value),
    };
    createProduct.mutate(payload, {
      onSuccess: () => {
        toast.success(<Trans message="Plan created" />);
        navigate('/admin/plans');
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <DashboardLayout.MainSection
      render={<HookForm.Root form={form} onSubmit={handleSubmit} />}
    >
      <StaticPageTitle>
        <Trans message="New plan" />
      </StaticPageTitle>

      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <Breadcrumb.Root className="text-xl">
          <Breadcrumb.Item>
            <Breadcrumb.Link to="/admin/plans">
              <Trans message="Plans" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>
              <Trans message="New plan" />
            </Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.Root>
        <Button
          variant="default"
          color="primary"
          type="submit"
          disabled={createProduct.isPending}
        >
          <Trans message="Create plan" />
        </Button>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent>
        <DashboardLayout.ContainedContent>
          <CrupdatePlanForm />
        </DashboardLayout.ContainedContent>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
