import {useCrupdateBiolinkWidget} from '@app/dashboard/stores/store-editor/content/widgets/use-crupdate-biolink-widget';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {digitalProductsIndex} from '@app/gen/digital-products';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {useQuery} from '@tanstack/react-query';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {Trans} from '@ui/i18n/trans';
import {PackageIcon, StoreIcon, XIcon} from 'lucide-react';
import {ReactElement, useMemo} from 'react';
import {Controller, useForm, useWatch} from 'react-hook-form';

export type ShopWidgetConfig = {
  title?: string;
  layout?: 'list' | 'grid';
  source?: 'digital-products';
  product_ids?: number[];
};

export type ShopWidget = Omit<BiolinkWidget, 'type' | 'config'> & {
  type: 'shop';
  config: ShopWidgetConfig;
};

type ShopProduct = {
  id: number;
  title: string;
  price_cents: number;
  currency: string;
  status?: string;
  cover?: {url?: string} | null;
};

export function ShopWidgetDialog({
  children,
  widget,
  open: propsOpen,
  onOpenChange: propsOnOpenChange,
}: {
  children?: ReactElement<typeof Dialog.Trigger>;
  widget?: ShopWidget;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useControlledState(
    propsOpen,
    false,
    propsOnOpenChange,
  );
  const {storeId} = useRequiredParams(['storeId']);
  const form = useForm<ShopWidgetConfig>({
    defaultValues: {
      title: widget?.config.title ?? '',
      layout: widget?.config.layout ?? 'list',
      source: 'digital-products',
      product_ids: widget?.config.product_ids ?? [],
    },
  });
  const mutation = useCrupdateBiolinkWidget(storeId, form, widget?.id);
  const layouts = [
    {value: 'list', label: <Trans message="List" />},
    {value: 'grid', label: <Trans message="Grid" />},
  ];
  const productIds = useWatch({control: form.control, name: 'product_ids'}) ?? [];
  const productsQuery = useQuery({
    queryKey: ['digital-products', 'shop-widget-picker', {per_page: 100}],
    queryFn: async () => {
      const response = await digitalProductsIndex({
        params: {per_page: 100},
      });
      return (response.data || []) as ShopProduct[];
    },
    enabled: open,
  });
  const approvedProducts = useMemo(
    () =>
      (productsQuery.data || []).filter(
        product => product.status === 'approved',
      ),
    [productsQuery.data],
  );
  const selectedProducts = useMemo(
    () =>
      approvedProducts.filter(product => productIds.includes(product.id)),
    [approvedProducts, productIds],
  );

  const toggleProduct = (productId: number, checked: boolean) => {
    const current = form.getValues('product_ids') ?? [];
    form.setValue(
      'product_ids',
      checked
        ? [...current, productId]
        : current.filter(id => id !== productId),
      {shouldDirty: true, shouldTouch: true},
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <HookForm.Root
          form={form}
          onSubmit={values =>
            mutation.mutate(
              {
                type: 'shop',
                config: values as unknown as BiolinkWidget['config'],
              },
              {
                onSuccess: () => setOpen(false),
                onError: error => onFormQueryError(error, form),
              },
            )
          }
        >
          <Dialog.Content className="sm:max-w-xl">
            <Dialog.Header>
              <Dialog.Title>
                <StoreIcon />
                <Trans message="Items" />
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Field.Group>
                <HookForm.Field name="title">
                  <Field.Label>
                    <Trans message="Section title" />
                  </Field.Label>
                  <Input placeholder="Shop" />
                  <Field.Description>
                    <Trans message="Choose which products appear from the My Items page." />
                  </Field.Description>
                </HookForm.Field>
                <HookForm.Field name="layout">
                  <Field.Label>
                    <Trans message="Layout" />
                  </Field.Label>
                  <Select.Root items={layouts}>
                    <Select.Trigger className="w-full">
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {layouts.map(item => (
                        <Select.Item key={item.value} value={item.value}>
                          {item.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </HookForm.Field>
                <Controller
                  control={form.control}
                  name="product_ids"
                  render={() => (
                    <Field.Root>
                      <Field.Label>
                        <Trans message="Products" />
                      </Field.Label>
                      <Field.Description>
                        <Trans message="Leave empty to show every approved public product." />
                      </Field.Description>
                      {selectedProducts.length > 0 && (
                        <ul className="mt-2 space-y-2">
                          {selectedProducts.map(product => (
                            <li
                              key={product.id}
                              className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                            >
                              <span className="min-w-0 flex-1 truncate text-sm">
                                {product.title}
                              </span>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Remove ${product.title}`}
                                onClick={() =>
                                  toggleProduct(product.id, false)
                                }
                              >
                                <XIcon />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 max-h-64 overflow-y-auto rounded-md border">
                        {productsQuery.isLoading ? (
                          <div className="space-y-2 p-3">
                            {[0, 1, 2].map(key => (
                              <Skeleton key={key} className="h-10 w-full" />
                            ))}
                          </div>
                        ) : productsQuery.isError ? (
                          <Empty.Root className="min-h-40 p-6">
                            <Empty.Header>
                              <Empty.Title>
                                <Trans message="Couldn't load products" />
                              </Empty.Title>
                              <Empty.Content>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void productsQuery.refetch()}
                                >
                                  <Trans message="Retry" />
                                </Button>
                              </Empty.Content>
                            </Empty.Header>
                          </Empty.Root>
                        ) : approvedProducts.length ? (
                          <div className="divide-y">
                            {approvedProducts.map(product => {
                              const checked = productIds.includes(product.id);
                              return (
                                <label
                                  key={product.id}
                                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium">
                                      {product.title}
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                      <FormattedCurrency
                                        valueInCents={product.price_cents}
                                        currency={product.currency}
                                      />
                                    </span>
                                  </span>
                                  <Checkbox
                                    bindToHookForm={false}
                                    checked={checked}
                                    onCheckedChange={next =>
                                      toggleProduct(product.id, next === true)
                                    }
                                    aria-label={product.title}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <Empty.Root className="min-h-40 p-6">
                            <Empty.Media variant="icon">
                              <PackageIcon />
                            </Empty.Media>
                            <Empty.Header>
                              <Empty.Title>
                                <Trans message="No approved products yet" />
                              </Empty.Title>
                              <Empty.Description>
                                <Trans message="Submit a product for review before adding it to this section." />
                              </Empty.Description>
                            </Empty.Header>
                          </Empty.Root>
                        )}
                      </div>
                    </Field.Root>
                  )}
                />
              </Field.Group>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseButton>
                <Trans message="Cancel" />
              </Dialog.CloseButton>
              <Button
                type="submit"
                disabled={mutation.isPending || !form.formState.isDirty}
              >
                {widget ? (
                  <Trans message="Update" />
                ) : (
                  <Trans message="Add" />
                )}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </HookForm.Root>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
