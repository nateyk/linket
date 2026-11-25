import {FeatureListEditor} from '@common/admin/settings/landing-page-settings/feature-section-settings';
import {getMissingCreatorJourneyImages} from '@common/admin/settings/landing-page-settings/creator-journey-image-presets';
import {Field} from '@shadcn/forms/field';
import {Button} from '@shadcn/button/button';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {ImagesIcon} from 'lucide-react';
import {useFormContext, useWatch} from 'react-hook-form';

const presentationOptions = [
  {value: 'standard', label: 'Standard feature grid'},
  {value: 'journey', label: 'Image-led journey steps'},
  {value: 'catalog', label: 'Product showcase cards'},
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
  const title = useWatch({name: `${prefix}.title`});
  const {getValues, setValue} = useFormContext();
  const isJourney = presentation === 'journey';
  const isCatalog = presentation === 'catalog';
  const isImageLayout = isJourney || isCatalog;
  const isCreatorJourney = title === 'From your first idea to your first sale';

  function enableImageJourney() {
    // Keep the editor's current copy, order and already-uploaded images intact.
    const steps = getValues(`${prefix}.features`) ?? [];
    for (const {index, image} of getMissingCreatorJourneyImages(steps)) {
      setValue(`${prefix}.features.${index}.image`, image, {shouldDirty: true});
    }
    setValue(`${prefix}.presentation`, 'journey', {
      shouldDirty: true,
      shouldValidate: true,
    });
  }
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

      {isCreatorJourney && !isImageLayout ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              <Trans message="Use images instead of icons" />
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              <Trans message="Switch these steps to illustrated cards with replaceable sample images. Your current titles and descriptions stay unchanged." />
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" color="primary" onClick={enableImageJourney}>
            <ImagesIcon />
            <Trans message="Enable illustrated steps" />
          </Button>
        </div>
      ) : null}

      <p className="text-sm leading-6 text-muted-foreground">
        <Trans message={
          isCatalog
            ? 'Open a product card to upload a licensed illustration, 3D render or image. Empty image slots keep your current icons.'
            : isJourney
              ? 'Open each journey step to upload or replace its image.'
              : 'Choose an image-led layout above to replace the icon cards with editable images.'
        } />
      </p>

      <FeatureListEditor
        prefix={prefix}
        withImages={isImageLayout}
        imageCardType={isCatalog ? 'product' : 'journey'}
      />

      <Field.Separator />

      {!isImageLayout ? <HookForm.Field name={`${prefix}.maxColumns`}>
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
