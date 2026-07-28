import {Field} from '@shadcn/forms/field';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@shadcn/forms/number-field/number-field';
import preview from '@storybook/preview';
import {Trans} from '@ui/i18n/trans';

const meta = preview.meta({
  title: 'Number Field',
  component: NumberField,
  tags: ['autodocs'],
});

export const Default = meta.story({
  render: () => (
    <div className="w-full max-w-xs">
      <Field.Root>
        <Field.Label>
          <Trans message="Quantity" />
        </Field.Label>
        <NumberField defaultValue={1} min={0} max={99}>
          <NumberFieldDecrement aria-label="Decrease quantity" />
          <NumberFieldInput />
          <NumberFieldIncrement aria-label="Increase quantity" />
        </NumberField>
        <Field.Description>
          <Trans message="Use plus and minus buttons to adjust value." />
        </Field.Description>
      </Field.Root>
    </div>
  ),
});

export const Invalid = meta.story({
  render: () => (
    <div className="w-full max-w-xs">
      <Field.Root data-invalid="true">
        <Field.Label htmlFor="capacity">
          <Trans message="Capacity" />
        </Field.Label>
        <NumberField id="capacity" min={1} max={100} defaultValue={0}>
          <NumberFieldDecrement aria-label="Decrease capacity" />
          <NumberFieldInput aria-invalid />
          <NumberFieldIncrement aria-label="Increase capacity" />
        </NumberField>
        <Field.Error>
          <Trans message="Value must be between 1 and 100." />
        </Field.Error>
      </Field.Root>
    </div>
  ),
});

export const Disabled = meta.story({
  render: () => (
    <div className="w-full max-w-xs">
      <Field.Root data-disabled="true">
        <Field.Label htmlFor="disabled-number">
          <Trans message="Disabled number field" />
        </Field.Label>
        <NumberField id="disabled-number" defaultValue={12} disabled>
          <NumberFieldDecrement aria-label="Decrease value" />
          <NumberFieldInput />
          <NumberFieldIncrement aria-label="Increase value" />
        </NumberField>
      </Field.Root>
    </div>
  ),
});
