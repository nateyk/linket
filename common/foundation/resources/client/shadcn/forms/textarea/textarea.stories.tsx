import {Field} from '@shadcn/forms/field';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import preview from '@storybook/preview';
import {Trans} from '@ui/i18n/trans';

const meta = preview.meta({
  title: 'Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    placeholder: 'Write something...',
  },
});

export const Basic = meta.story({
  render: () => (
    <div className="w-full max-w-md">
      <Field.Root>
        <Field.Label htmlFor="textarea-basic">
          <Trans message="Message" />
        </Field.Label>
        <Textarea id="textarea-basic" placeholder="Type your message..." />
        <Field.Description>
          <Trans message="This text will be visible to other members." />
        </Field.Description>
      </Field.Root>
    </div>
  ),
});

export const Invalid = meta.story({
  render: () => (
    <div className="w-full max-w-md">
      <Field.Root data-invalid="true">
        <Field.Label htmlFor="textarea-invalid">
          <Trans message="Bio" />
        </Field.Label>
        <Textarea
          id="textarea-invalid"
          aria-invalid
          placeholder="Tell us about yourself..."
        />
        <Field.Error>
          <Trans message="Bio must be at least 20 characters." />
        </Field.Error>
      </Field.Root>
    </div>
  ),
});

export const Disabled = meta.story({
  render: () => (
    <div className="w-full max-w-md">
      <Field.Root data-disabled="true">
        <Field.Label htmlFor="textarea-disabled">
          <Trans message="Notes" />
        </Field.Label>
        <Textarea
          id="textarea-disabled"
          disabled
          placeholder="No longer editable"
        />
        <Field.Description>
          <Trans message="This field is read-only." />
        </Field.Description>
      </Field.Root>
    </div>
  ),
});

export const Rtl = meta.story({
  render: () => (
    <div className="w-full max-w-md" dir="rtl">
      <Field.Root>
        <Field.Label htmlFor="textarea-rtl">
          <Trans message="منطقة النص" />
        </Field.Label>
        <Textarea
          id="textarea-rtl"
          placeholder="اكتب تعليقًا هنا..."
          defaultValue="النص يتدفق من اليمين إلى اليسار."
        />
        <Field.Description>
          <Trans message="مثال لاتجاه الكتابة من اليمين إلى اليسار." />
        </Field.Description>
      </Field.Root>
    </div>
  ),
});
