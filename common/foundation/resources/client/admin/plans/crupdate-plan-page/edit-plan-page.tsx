import {
  retrieveProductOptions,
  updateProductOptions,
} from '@common/admin/subscriptions/products-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useForm} from 'react-hook-form';
import {CrupdatePlanForm, CrupdatePlanFormValues} from './crupdate-plan-form';

export function Component() {
  const navigate = useNavigate();
  const {productId} = useRequiredParams(['productId']);
  const query = useSuspenseQuery(retrieveProductOptions(Number(productId)));
  const product = query.data.data;

  const form = useForm<CrupdatePlanFormValues>({
    defaultValues: {
      name: product.name,
      description: product.description,
      position: product.position,
      recommended: product.recommended,
      hidden: product.hidden,
      free: product.free,
      feature_list: product.feature_list?.map(f => ({value: f})) ?? [],
      prices: product.prices ?? [],
      trial_period_days: product.trial_period_days,
      permissions: product.permissions ?? [],
    },
  });
  const updateProduct = useMutation(updateProductOptions(product.id));

  const handleSubmit = (values: CrupdatePlanFormValues) => {
    const payload = {
      ...values,
      feature_list: values.feature_list.map(f => f.value),
    };
    updateProduct.mutate(payload, {
      onSuccess: () => {
        toast.success(<Trans message="Plan updated" />);
        navigate('/admin/plans');
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <DashboardLayout.MainSection
      render={<HookForm.Root form={form} onSubmit={handleSubmit} />}
    >
      <StaticPageTitle>{product.name}</StaticPageTitle>

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
            <Breadcrumb.Page>{product.name}</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.Root>
        <Button
          variant="default"
          color="primary"
          type="submit"
          disabled={updateProduct.isPending}
        >
          <Trans message="Update plan" />
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
