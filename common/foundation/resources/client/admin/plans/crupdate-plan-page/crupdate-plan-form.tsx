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
        </Field.Group>
      </FieldSet.Root>

      <FeatureListForm />
      <PricingListForm />
      <TrialSection />

      <FieldSet.Root>
        <FieldSet.Legend>
          <Trans message="Permissions" />
        </FieldSet.Legend>
        <FormPermissionSelector name="permissions" roleType="users" />
      </FieldSet.Root>
    </div>
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
                      currency: field.currency ?? 'USD',
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
              currency: 'USD',
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

function TrialSection() {
  const {trans} = useTrans();

  return (
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
  );
}
