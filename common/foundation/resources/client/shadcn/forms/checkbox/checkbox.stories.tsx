import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Field} from '@shadcn/forms/field';
import preview from '@storybook/preview';

const meta = preview.meta({
  title: 'Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
});

export const Vertical = meta.story({
  render: () => (
    <Field.Group className="mx-auto w-72">
      <Field.Root>
        <Field.Label htmlFor="terms-checkbox-desc">
          <Checkbox
            id="terms-checkbox-desc"
            name="terms-checkbox-desc"
            defaultChecked
          />
          Accept terms and conditions
        </Field.Label>
        <Field.Description>
          By clicking this checkbox, you agree to the terms and conditions.
        </Field.Description>
      </Field.Root>
    </Field.Group>
  ),
});

export const Invalid = meta.story({
  render: () => (
    <Field.Group className="mx-auto w-72">
      <Field.Root data-invalid>
        <Field.Label>
          <Checkbox aria-invalid defaultChecked />
          Accept terms and conditions
        </Field.Label>
      </Field.Root>
    </Field.Group>
  ),
});

export const Disabled = meta.story({
  render: () => (
    <Field.Group className="mx-auto w-72">
      <Field.Root data-disabled>
        <Field.Label>
          <Checkbox disabled defaultChecked />
          Accept terms and conditions
        </Field.Label>
      </Field.Root>
    </Field.Group>
  ),
});
