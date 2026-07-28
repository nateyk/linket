import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';

type Props = {
  autoFocus?: boolean;
  className?: string;
};
export function DestinationUrlField({autoFocus, className}: Props) {
  const {links} = useSettings();

  return (
    <HookForm.Field name="long_url">
      <Field.Label>
        <Trans message="Destination URL" />
      </Field.Label>
      <Input
        placeholder="https://example.com"
        autoComplete="off"
        spellCheck="false"
        required
        autoFocus={autoFocus}
        minLength={links?.min_len}
        maxLength={links?.max_len}
        className={className}
      />
      <Field.Error />
    </HookForm.Field>
  );
}
