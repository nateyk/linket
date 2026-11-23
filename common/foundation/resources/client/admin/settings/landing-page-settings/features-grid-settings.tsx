import {FeatureListEditor} from '@common/admin/settings/landing-page-settings/feature-section-settings';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {useWatch} from 'react-hook-form';

const presentationOptions = [
  {value: 'standard', label: 'Standard feature grid'},
  {value: 'journey', label: 'Image-led journey steps'},
] as const;

const maxColumnsOptions = [
  {value: '2', label: '2'},
  {value: '3', label: '3'},
  {value: '4', label: '4'},
] as const;

type Props = {
  index: number;
};
export function FeaturesGridSettings({index}: Props) {
  const prefix =
    `client.landingPage.sections.${index}` as `client.landingPage.sections.${number}`;
  const presentation = useWatch({name: `${prefix}.presentation`});
  const isJourney = presentation === 'journey';
  return (
    <Field.Group>
      <HookForm.Field name={`${prefix}.badge`}>
        <Field.Label>
          <Trans message="Badge" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>

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
        <Textarea />
        <Field.Error />
      </HookForm.Field>

      <Field.Separator />

      <HookForm.Field name={`${prefix}.presentation`}>
        <Field.Label>
          <Trans message="Section layout" />
        </Field.Label>
        <Select.Root items={presentationOptions}>
          <Select.Trigger className="w-full">
            <Select.Value placeholder={<Trans message="Standard feature grid" />} />
          </Select.Trigger>
          <Select.Content>
            {presentationOptions.map(option => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>

      <FeatureListEditor prefix={prefix} withImages={isJourney} />

      <Field.Separator />

      {!isJourney ? <HookForm.Field name={`${prefix}.maxColumns`}>
        <Field.Label>
          <Trans message="Maximum columns" />
        </Field.Label>
        <Select.Root items={maxColumnsOptions}>
          <Select.Trigger className="w-full">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {maxColumnsOptions.map(option => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field> : null}

      {!isJourney ? <HookForm.Field name={`${prefix}.iconsOnTop`}>
        <Field.Label>
          <Switch />
          <Trans message="Icons on top" />
        </Field.Label>
        <Field.Error />
      </HookForm.Field> : null}

      <HookForm.Field name={`${prefix}.mutedBg`}>
        <Field.Label>
          <Switch />
          <Trans message="Muted background" />
        </Field.Label>
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}
