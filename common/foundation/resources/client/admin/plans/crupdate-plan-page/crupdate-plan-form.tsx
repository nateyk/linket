import {CrupdateProductBody} from '@app/gen/schemas/crupdate-product-body';
import {FormPermissionSelector} from '@common/auth/ui/permission-selector';
import {FormattedPrice} from '@common/billing/formatted-price';
import {Accordion} from '@shadcn/accordion/accordion';
import {Button} from '@shadcn/button/button';
import {Field, FieldSet} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@shadcn/forms/number-field/number-field';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {PlusIcon, XIcon} from 'lucide-react';
import {useState} from 'react';
import type {ReactNode} from 'react';
import {useFieldArray, useFormContext, useWatch} from 'react-hook-form';
import {PriceForm} from './price-form';

export type CrupdatePlanFormValues = Omit<
  CrupdateProductBody,
  'feature_list'
> & {
  feature_list: {value: string}[];
};

const positionItems = [
  {value: 0, label: <Trans message="First" />},
  {value: 1, label: <Trans message="Second" />},
  {value: 2, label: <Trans message="Third" />},
  {value: 3, label: <Trans message="Fourth" />},
  {value: 4, label: <Trans message="Fifth" />},
];

export function CrupdatePlanForm() {
  return (
    <div className="flex flex-col gap-10">
      <GeneralSection />
      <PricingListForm />
      <CommerceSection />
      <CreatorSection />
      <GrowthSection />
      <AdvancedSection />
    </div>
  );
}

function GeneralSection() {
  const {trans} = useTrans();

  return (
    <>
      <Field.Group>
        <HookForm.Field name="name">
          <Field.Label>
            <Trans message="Name" />
          </Field.Label>
          <Input required autoFocus />
          <Field.Error />
        </HookForm.Field>

        <HookForm.Field name="description">
          <Field.Label>
            <Trans message="Description" />
          </Field.Label>
          <Textarea rows={4} />
          <Field.Error />
        </HookForm.Field>

        <HookForm.Field name="position">
          <Field.Label>
            <Trans message="Position in pricing table" />
          </Field.Label>
          <Select.Root items={positionItems}>
            <Select.Trigger className="w-full">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {positionItems.map(item => (
                <Select.Item key={item.value} value={item.value}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Field.Error />
        </HookForm.Field>
      </Field.Group>

      <FieldSet.Root>
        <FieldSet.Legend>
          <Trans message="Visibility" />
        </FieldSet.Legend>
        <Field.Group>
          <HookForm.Field name="recommended">
            <Field.Label>
              <Switch />
              <Trans message="Recommend" />
            </Field.Label>
            <Field.Description>
              <Trans message="Plan will be displayed more prominently on pricing page." />
            </Field.Description>
            <Field.Error />
          </HookForm.Field>

          <HookForm.Field name="hidden">
            <Field.Label>
              <Switch />
              <Trans message="Hidden" />
            </Field.Label>
            <Field.Description>
              <Trans message="Plan will not be shown on pricing or upgrade pages." />
            </Field.Description>
            <Field.Error />
          </HookForm.Field>

          <HookForm.Field name="free">
            <Field.Label>
              <Switch />
              <Trans message="Free" />
            </Field.Label>
            <Field.Description>
              <Trans message="Will be assigned to all users, if they are not subscribed already." />
            </Field.Description>
            <Field.Error />
          </HookForm.Field>

          <HookForm.Field name="active">
            <Field.Label>
              <Switch />
              <Trans message="Active" />
            </Field.Label>
            <Field.Description>
              <Trans message="Disabled plans are never assigned to users." />
            </Field.Description>
            <Field.Error />
          </HookForm.Field>

          <HookForm.Field name="is_default">
            <Field.Label>
              <Switch />
              <Trans message="Default plan" />
            </Field.Label>
            <Field.Description>
              <Trans message="Assigned to users without an active subscription. The default plan cannot be disabled or deleted." />
            </Field.Description>
            <Field.Error />
          </HookForm.Field>
        </Field.Group>
      </FieldSet.Root>

      <FieldSet.Root>
        <FieldSet.Legend>
          <Trans message="Free trial" />
        </FieldSet.Legend>
        <FieldSet.Description>
          <Trans message="Customer will only be charged after the trial period ends." />
        </FieldSet.Description>
        <Field.Group>
          <HookForm.Field name="trial_period_days">
            <Field.Label>
              <Trans message="Trial period days" />
            </Field.Label>
            <NumberField min={0} max={14} step={1}>
              <NumberFieldDecrement />
              <NumberFieldInput placeholder={trans(message('Optional'))} />
              <NumberFieldIncrement />
            </NumberField>
            <Field.Error />
          </HookForm.Field>
        </Field.Group>
      </FieldSet.Root>
    </>
  );
}

function FeatureListForm() {
  const {fields, append, remove} = useFieldArray<CrupdatePlanFormValues>({
    name: 'feature_list',
  });

  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <Trans message="Feature list" />
      </FieldSet.Legend>
      <Field.Group>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2.5">
            <HookForm.Field
              name={`feature_list.${index}.value`}
              className="flex-auto"
            >
              <Input />
              <Field.Error />
            </HookForm.Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
            >
              <XIcon />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-max"
          onClick={() => append({value: ''})}
        >
          <PlusIcon />
          <Trans message="Add feature" />
        </Button>
      </Field.Group>
    </FieldSet.Root>
  );
}

function PricingListForm() {
  const isFree = useWatch<CrupdatePlanFormValues>({name: 'free'});
  const {
    formState: {errors},
  } = useFormContext<CrupdatePlanFormValues>();
  const {fields, append, remove} = useFieldArray<
    CrupdatePlanFormValues,
    'prices'
  >({
    name: 'prices',
  });

  if (isFree) {
    return null;
  }

  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <Trans message="Pricing" />
      </FieldSet.Legend>
      {errors.prices?.message && (
        <p className="text-sm text-destructive">{errors.prices.message}</p>
      )}
      <Field.Group>
        {fields.length > 0 && (
          <Accordion.Root variant="separated">
            {fields.map((field, index) => (
              <Accordion.Item key={field.id} value={index}>
                <Accordion.Trigger>
                  <FormattedPrice
                    price={{
                      amount: Number(field.amount ?? 0),
                      currency: field.currency ?? 'ETB',
                      interval: field.interval ?? 'month',
                      interval_count: field.interval_count ?? 1,
                    }}
                  />
                </Accordion.Trigger>
                <Accordion.Content>
                  <PriceForm
                    index={index}
                    onRemovePrice={() => remove(index)}
                  />
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        )}
        <Button
          type="button"
          variant="outline"
          className="w-max"
          size="sm"
          onClick={() =>
            append({
              currency: 'ETB',
              amount: 1,
              interval_count: 1,
              interval: 'month',
            })
          }
        >
          <PlusIcon />
          <Trans message="Add price" />
        </Button>
      </Field.Group>
    </FieldSet.Root>
  );
}

function CommerceSection() {
  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <Trans message="Commerce" />
      </FieldSet.Legend>
      <Field.Group>
        <PlatformFeeField />
        <LimitField
          name="storefront_benefits.max_free_products"
          label={<Trans message="Free products" />}
          description={<Trans message="Maximum number of free products a creator can sell." />}
        />
        <LimitField
          name="storefront_benefits.max_paid_products"
          label={<Trans message="Paid products" />}
          description={<Trans message="Maximum number of paid products a creator can sell." />}
        />
        <StorageLimitField />
      </Field.Group>
    </FieldSet.Root>
  );
}

function CreatorSection() {
  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <Trans message="Creator" />
      </FieldSet.Legend>
      <Field.Group>
        <LimitField
          name="storefront_benefits.max_storefronts"
          label={<Trans message="Storefronts" />}
          description={<Trans message="Maximum number of storefronts (link in bio) per workspace." />}
        />
        <LimitField
          name="storefront_benefits.max_workspaces"
          label={<Trans message="Workspaces" />}
          description={<Trans message="Maximum number of workspaces per user." />}
        />
      </Field.Group>
    </FieldSet.Root>
  );
}

function GrowthSection() {
  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <Trans message="Growth" />
      </FieldSet.Legend>
      <Field.Group>
        <HookForm.Field name="storefront_benefits.tracking_pixels_enabled">
          <Field.Label>
            <Switch />
            <Trans message="Tracking pixels" />
          </Field.Label>
          <Field.Description>
            <Trans message="Creators can add tracking pixels to their links." />
          </Field.Description>
          <Field.Error />
        </HookForm.Field>
      </Field.Group>
    </FieldSet.Root>
  );
}

type LimitFieldProps = {
  name:
    | 'storefront_benefits.max_free_products'
    | 'storefront_benefits.max_paid_products'
    | 'storefront_benefits.max_storefronts'
    | 'storefront_benefits.max_workspaces';
  label: ReactNode;
  description?: ReactNode;
};

function LimitField({name, label, description}: LimitFieldProps) {
  const {watch, setValue} = useFormContext<CrupdatePlanFormValues>();
  const value = watch(name) as number | null | undefined;
  const unlimited = value === null || value === undefined;

  return (
    <Field.Group>
      <Field.Label>{label}</Field.Label>
      <div className="flex items-center gap-3">
        <Input
          type="number"
          min={0}
          step={1}
          className="max-w-32"
          value={unlimited ? '' : value}
          disabled={unlimited}
          onChange={e =>
            setValue(name, Number(e.target.value), {shouldDirty: true})
          }
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={unlimited}
            onCheckedChange={checked =>
              setValue(name, checked ? null : 0, {shouldDirty: true})
            }
          />
          <Trans message="Unlimited" />
        </label>
      </div>
      {description && <Field.Description>{description}</Field.Description>}
    </Field.Group>
  );
}

function PlatformFeeField() {
  const {watch, setValue} = useFormContext<CrupdatePlanFormValues>();
  const value = watch('storefront_benefits.platform_fee_percent') as
    | number
    | null
    | undefined;

  return (
    <Field.Group>
      <Field.Label>
        <Trans message="Platform fee" />
      </Field.Label>
      <div className="flex items-center gap-3">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.5}
          className="max-w-32"
          value={value ?? 0}
          onChange={e =>
            setValue(
              'storefront_benefits.platform_fee_percent',
              Number(e.target.value),
              {shouldDirty: true},
            )
          }
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
      <Field.Description>
        <Trans message="Percentage of each sale deducted as platform commission." />
      </Field.Description>
    </Field.Group>
  );
}

function StorageLimitField() {
  const {watch, setValue} = useFormContext<CrupdatePlanFormValues>();
  const bytes = watch('storefront_benefits.max_upload_bytes') as
    | number
    | null
    | undefined;
  const unlimited = bytes === null || bytes === undefined;
  const [gb, setGb] = useState<number>(bytes == null ? 1 : bytes / 1073741824);

  return (
    <Field.Group>
      <Field.Label>
        <Trans message="Storage" />
      </Field.Label>
      <div className="flex items-center gap-3">
        <Input
          type="number"
          min={0}
          step={0.1}
          className="max-w-32"
          value={unlimited ? '' : gb}
          disabled={unlimited}
          onChange={e => {
            const next = Number(e.target.value);
            setGb(next);
            setValue(
              'storefront_benefits.max_upload_bytes',
              Math.round(next * 1073741824),
              {shouldDirty: true},
            );
          }}
        />
        <span className="text-sm text-muted-foreground">
          <Trans message="GB" />
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={unlimited}
            onCheckedChange={checked => {
              if (checked) {
                setValue('storefront_benefits.max_upload_bytes', null, {
                  shouldDirty: true,
                });
              } else {
                setGb(1);
                setValue('storefront_benefits.max_upload_bytes', 1073741824, {
                  shouldDirty: true,
                });
              }
            }}
          />
          <Trans message="Unlimited" />
        </label>
      </div>
      <Field.Description>
        <Trans message="Total size of all downloadable product files per workspace." />
      </Field.Description>
    </Field.Group>
  );
}

function AdvancedSection() {
  return (
    <Accordion.Root variant="separated">
      <Accordion.Item value="advanced">
        <Accordion.Trigger>
          <Trans message="Advanced (deprecated)" />
        </Accordion.Trigger>
        <Accordion.Content>
          <FeatureListForm />
          <FieldSet.Root>
            <FieldSet.Legend>
              <Trans message="Legacy permissions" />
            </FieldSet.Legend>
            <FieldSet.Description>
              <Trans message="Deprecated. Prefer the plan limits configured above." />
            </FieldSet.Description>
            <FormPermissionSelector name="permissions" roleType="users" />
          </FieldSet.Root>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}
