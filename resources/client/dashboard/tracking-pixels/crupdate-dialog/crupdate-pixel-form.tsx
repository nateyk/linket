import {SupportedTrackingPixels} from '@app/dashboard/tracking-pixels/supported-tracking-pixels';
import {CrupdateTrackingPixelBody} from '@app/gen/schemas/crupdate-tracking-pixel-body';
import {RemoteFavicon} from '@common/ui/other/remote-favicon';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {CircleHelpIcon, SlidersHorizontalIcon} from 'lucide-react';
import {Fragment, useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function CrupdatePixelForm() {
  const {watch} = useFormContext<CrupdateTrackingPixelBody>();
  const type = watch('type');
  const config = SupportedTrackingPixels.find(p => p.name === type);

  const typeItems = useMemo(
    () =>
      SupportedTrackingPixels.map(pixel => ({
        value: pixel.name,
        label: pixel.name,
        docsUrl: pixel.docsUrl,
      })),
    [],
  );

  return (
    <Field.Group>
      <HookForm.Field name="name">
        <Field.Label>
          <Trans message="Name" />
        </Field.Label>
        <Input autoFocus required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name="type">
        <Field.Label>
          <Trans message="Type" />
        </Field.Label>
        <Select.Root items={typeItems}>
          <Select.Trigger>
            <Select.Value>
              {config?.docsUrl ? (
                <RemoteFavicon url={config.docsUrl} />
              ) : (
                <SlidersHorizontalIcon className="size-4" />
              )}
              {config?.name}
            </Select.Value>
          </Select.Trigger>
          <Select.Content>
            {typeItems.map(item => (
              <Select.Item key={item.value} value={item.value}>
                {item.docsUrl ? (
                  <RemoteFavicon url={item.docsUrl} />
                ) : (
                  <SlidersHorizontalIcon className="size-4" />
                )}
                {item.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        {config?.docsUrl ? (
          <Field.Description className="flex items-center gap-1.5">
            <CircleHelpIcon className="size-4" />
            <a href={config.docsUrl} target="_blank">
              <Trans message="More information" />
            </a>
          </Field.Description>
        ) : null}
        <Field.Error />
      </HookForm.Field>
      {type !== 'custom' && (
        <HookForm.Field name="pixel_id">
          <Field.Label>
            <Trans message="Pixel ID" />
          </Field.Label>
          <Input
            required
            pattern={config?.pattern}
            type={config?.type === 'number' ? 'number' : 'text'}
          />
          <Field.Error />
        </HookForm.Field>
      )}
      {type === 'custom' && <CustomCodeFields />}
    </Field.Group>
  );
}

function CustomCodeFields() {
  return (
    <Fragment>
      <HookForm.Field name="head_code">
        <Field.Label>
          <Trans message="Custom code for page head" />
        </Field.Label>
        <Textarea rows={5} />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name="body_code">
        <Field.Label>
          <Trans message="Custom code for page body" />
        </Field.Label>
        <Textarea rows={5} />
        <Field.Error />
      </HookForm.Field>
    </Fragment>
  );
}
