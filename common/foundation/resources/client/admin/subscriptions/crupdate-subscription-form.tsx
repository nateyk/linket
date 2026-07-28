import {CrupdateSubscriptionBody} from '@app/gen/schemas/crupdate-subscription-body';
import {User} from '@app/gen/schemas/user';
import {listProductsOptions} from '@common/admin/subscriptions/products-queries';
import {
  listUsersOptions,
  retrieveUserOptions,
} from '@common/admin/users/users-queries';
import {FormattedPrice} from '@common/billing/formatted-price';
import {Avatar} from '@shadcn/avatar/avatar';
import {ModelSelect} from '@shadcn/forms/combobox/model-select';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {useQuery} from '@tanstack/react-query';
import {FormDatePicker} from '@ui/forms/input-field/date/date-picker/date-picker';
import {Trans} from '@ui/i18n/trans';
import {Nullable} from '@ui/utils/ts/nullable';
import {useMemo} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function CrupdateSubscriptionForm() {
  const {setValue} = useFormContext<Nullable<CrupdateSubscriptionBody>>();
  const productsQuery = useQuery(listProductsOptions());
  const watchedProductId = useWatch({name: 'product_id'});
  const selectedProduct = productsQuery.data?.data.find(
    p => p.id === watchedProductId,
  );

  const productItems = useMemo(
    () =>
      productsQuery.data?.data
        .filter(p => !p.free)
        .map(product => ({
          value: product.id,
          label: product.name,
        })) ?? [],
    [productsQuery.data?.data],
  );

  const priceItems = useMemo(
    () =>
      selectedProduct?.prices?.map(price => ({
        value: price.id,
        label: <FormattedPrice price={price} />,
      })) ?? [],
    [selectedProduct?.prices],
  );

  return (
    <Field.Group>
      <HookForm.Field name="user_id">
        <Field.Label>
          <Trans message="User" />
        </Field.Label>
        <ModelSelect
          listOptions={({query}) => listUsersOptions({query})}
          retrieveOptions={({id}) => retrieveUserOptions(id)}
          modelToLabel={(user: User) => user.name ?? user.email}
          modelToImage={(user: User) => (
            <Avatar.Root size="sm">
              <Avatar.Image src={user.image} />
              <Avatar.ColorFallback>
                {user.name ?? user.email}
              </Avatar.ColorFallback>
            </Avatar.Root>
          )}
        />
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name="product_id">
        <Field.Label>
          <Trans message="Plan" />
        </Field.Label>
        <Select.Root
          items={productItems}
          onValueChange={() => {
            setValue('price_id', null, {
              shouldDirty: true,
            });
          }}
        >
          <Select.Trigger className="w-full">
            <Select.Value placeholder={<Trans message="Select plan" />} />
          </Select.Trigger>
          <Select.Content>
            {productItems.map(product => (
              <Select.Item key={product.value} value={product.value}>
                <Trans message={product.label} />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>

      {!selectedProduct?.free && priceItems.length > 0 && (
        <HookForm.Field name="price_id">
          <Field.Label>
            <Trans message="Price" />
          </Field.Label>
          <Select.Root items={priceItems}>
            <Select.Trigger className="w-full">
              <Select.Value placeholder={<Trans message="Select price" />} />
            </Select.Trigger>
            <Select.Content>
              {priceItems.map(price => (
                <Select.Item key={price.value} value={price.value}>
                  {price.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Field.Error />
        </HookForm.Field>
      )}

      <HookForm.Field name="description">
        <Field.Label>
          <Trans message="Description" />
        </Field.Label>
        <Textarea />
        <Field.Error />
      </HookForm.Field>

      <FormDatePicker
        size="sm"
        name="renews_at"
        granularity="day"
        label={<Trans message="Renews at" />}
        description={
          <Trans message="This will only change local records. User will continue to be billed on their original cycle on the payment gateway." />
        }
      />

      <FormDatePicker
        size="sm"
        name="ends_at"
        granularity="day"
        label={<Trans message="Ends at" />}
        description={
          <Trans message="This will only change local records. User will continue to be billed on their original cycle on the payment gateway." />
        }
      />
    </Field.Group>
  );
}
