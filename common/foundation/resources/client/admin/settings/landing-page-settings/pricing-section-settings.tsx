import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {Link} from 'react-router';

type Props = {
  index: number;
};
export function PricingSectionSettings({index}: Props) {
  const prefix =
    `client.landingPage.sections.${index}` as `client.landingPage.sections.${number}`;
  return (
    <Field.Group>
      <HookForm.Field name={`${prefix}.title`}>
        <Field.Label>
          <Trans message="Title" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name={`${prefix}.description`}>
        <Field.Label>
          <Trans message="Description" />
        </Field.Label>
        <Textarea rows={4} />
        <Field.Error />
      </HookForm.Field>

      <div className="text-sm">
        <Trans
          message="Configure pricing plans and features from <a>plans page</a>."
          values={{
            a: text => (
              <Link
                className="text-primary underline"
                to="/admin/plans"
                target="_blank"
              >
                {text}
              </Link>
            ),
          }}
        />
      </div>
    </Field.Group>
  );
}
