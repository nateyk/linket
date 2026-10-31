import {
  planAuditOptions,
  planSubscribersOptions,
  retrieveProductOptions,
  updateProductOptions,
} from '@common/admin/subscriptions/products-queries';
import {Product} from '@app/gen/schemas/product';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {Badge} from '@shadcn/badge/badge';
import {Card} from '@shadcn/card/card';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useQuery, useSuspenseQuery} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
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
      active: product.active,
      is_default: product.is_default,
      storefront_benefits: product.storefront_benefits ?? {},
      feature_list: product.feature_list?.map(f => ({value: f})) ?? [],
      prices: (product.prices as unknown as CrupdatePlanFormValues['prices']) ?? [],
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
      render={<HookForm.Root form={form as any} onSubmit={handleSubmit} />}
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
          <PlanManagementDetails productId={product.id} product={product} />
        </DashboardLayout.ContainedContent>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function PlanManagementDetails({
  productId,
  product,
}: {
  productId: number;
  product: Product;
}) {
  const subscribers = useQuery(planSubscribersOptions(productId));
  const audit = useQuery(planAuditOptions(productId));
  const benefits = product.storefront_benefits;
  const price = product.prices?.find(item => item.currency.toUpperCase() === 'ETB');

  return (
    <div className="mt-10 flex flex-col gap-6">
      <Card.Root>
        <Card.Header>
          <Card.Title><Trans message="Customer preview" /></Card.Title>
          <Card.Description><Trans message="How this plan is summarized to customers." /></Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{product.name}</h2>
            <Badge variant={product.active ? 'default' : 'outline'}>
              {product.active ? <Trans message="Available" /> : <Trans message="Unavailable" />}
            </Badge>
          </div>
          {product.description ? <p className="text-sm text-muted-foreground">{product.description}</p> : null}
          <p className="text-sm">
            {product.free ? (
              <Trans message="Free forever · :limit lifetime verified sales" values={{limit: benefits?.free_verified_sales ?? 0}} />
            ) : (
              <Trans message=":amount :currency per month" values={{amount: price?.amount ?? 0, currency: price?.currency ?? 'ETB'}} />
            )}
          </p>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {product.pricing_features?.map(feature => <li key={feature}>{feature}</li>)}
          </ul>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title><Trans message="Subscribers" /></Card.Title>
          <Card.Description>
            <Trans message=":total subscriptions · first 20 shown" values={{total: subscribers.data?.total ?? 0}} />
          </Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          {subscribers.data?.data.length ? subscribers.data.data.map(subscription => (
            <div key={subscription.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
              <div>
                <div className="text-sm font-medium">{subscription.user.name ?? subscription.user.email}</div>
                <div className="text-xs text-muted-foreground">{subscription.user.email}</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{subscription.status}</Badge>
                {subscription.renews_at ? <FormattedDate date={subscription.renews_at} /> : null}
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground"><Trans message="No subscriptions found." /></p>}
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title><Trans message="Change history" /></Card.Title>
          <Card.Description><Trans message="Recent audited edits to this plan." /></Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          {audit.data?.data.length ? audit.data.data.map(entry => (
            <div key={entry.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-2 last:border-0">
              <div>
                <div className="text-sm font-medium">
                  <Trans message=":change by :actor" values={{change: entry.change_type, actor: entry.actor?.name ?? 'System'}} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {Object.keys(entry.after).join(', ')}
                </div>
                <details className="mt-1 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    <Trans message="View before and after" />
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-card-sm bg-muted p-3 text-xs">
                    {JSON.stringify({before: entry.before, after: entry.after}, null, 2)}
                  </pre>
                </details>
              </div>
              {entry.created_at ? <FormattedDate date={entry.created_at} /> : null}
            </div>
          )) : <p className="text-sm text-muted-foreground"><Trans message="No changes have been recorded." /></p>}
        </Card.Content>
      </Card.Root>
    </div>
  );
}
