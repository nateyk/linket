import {useLinkFeatureStatus} from '@app/dashboard/upgrade/use-feature-status';
import {CrupdateLinkBody} from '@app/gen/schemas/crupdate-link-body';
import {CountryCombobox} from '@common/auth/ui/account-settings/country-combobox';
import {NoFeaturePermissionPopover} from '@common/billing/upgrade/no-permission-button';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field, FieldSet} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Trans} from '@ui/i18n/trans';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';
import {
  AirplayIcon,
  MapPinIcon,
  MonitorSmartphoneIcon,
  PlusIcon,
  XIcon,
} from 'lucide-react';
import {ReactNode, useMemo, useState} from 'react';
import {useFieldArray, useForm} from 'react-hook-form';

type FormValue = {
  rules: CrupdateLinkBody['rules'];
};

type Props = {
  values: CrupdateLinkBody['rules'];
  onSubmit: (values: FormValue) => void;
  children: ReactNode;
};

export function RetargetingDialog({children, onSubmit, values}: Props) {
  const [open, setOpen] = useState(false);
  const handleSubmit = (values: FormValue) => {
    onSubmit(values);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent values={values} onSubmit={handleSubmit} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({values, onSubmit}: Pick<Props, 'values' | 'onSubmit'>) {
  const {disabled: retargetingDisabled} = useLinkFeatureStatus('retargeting');

  const form = useForm<FormValue>({
    defaultValues: {
      rules: values ?? [],
    },
  });

  return (
    <HookForm.Root form={form} onSubmit={onSubmit}>
      <Dialog.Content className="sm:max-w-2xl">
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Retargeting" />
            {retargetingDisabled && (
              <NoFeaturePermissionPopover.Root
                message={
                  <Trans message="Your current plan doesn't include link retargeting." />
                }
              >
                <NoFeaturePermissionPopover.ButtonTrigger />
              </NoFeaturePermissionPopover.Root>
            )}
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <GeoRulesSection disabled={retargetingDisabled} />
            <Field.Separator />
            <DeviceRulesSection disabled={retargetingDisabled} />
            <Field.Separator />
            <PlatformRulesSection disabled={retargetingDisabled} />
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Close" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={retargetingDisabled}>
            <Trans message="Save changes" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

function GeoRulesSection({disabled}: {disabled: boolean}) {
  const {fields, append, remove} = useFieldArray<FormValue>({
    name: 'rules',
  });

  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <MapPinIcon />
        <Trans message="Location targeting" />
      </FieldSet.Legend>
      <FieldSet.Description>
        <Trans message="Redirect users to different url based on their location." />
      </FieldSet.Description>
      <Field.Group>
        {fields.map((field, index) => {
          if (field.type !== 'geo') {
            return null;
          }

          return (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
            >
              <HookForm.Field name={`rules.${index}.key`} disabled={disabled}>
                <Field.Label>
                  <Trans message="Country" />
                </Field.Label>
                <CountryCombobox />
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name={`rules.${index}.value`} disabled={disabled}>
                <Field.Label>
                  <Trans message="URL" />
                </Field.Label>
                <Input required type="url" />
                <Field.Error />
              </HookForm.Field>

              <RemoveButton onClick={() => remove(index)} />
            </div>
          );
        })}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-max"
          onClick={() => append({key: 'us', value: '', type: 'geo'})}
          disabled={disabled}
        >
          <PlusIcon />
          <Trans message="Add location" />
        </Button>
      </Field.Group>
    </FieldSet.Root>
  );
}

function DeviceRulesSection({disabled}: {disabled: boolean}) {
  const selectItems = useMemo(
    () => [
      {value: 'desktop', label: <Trans message="Desktop" />},
      {value: 'tablet', label: <Trans message="Tablet" />},
      {value: 'mobile', label: <Trans message="Mobile" />},
    ],
    [],
  );

  const {fields, append, remove} = useFieldArray<FormValue>({
    name: 'rules',
  });

  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <MonitorSmartphoneIcon aria-hidden />
        <Trans message="Device targeting" />
      </FieldSet.Legend>
      <FieldSet.Description>
        <Trans message="Redirect users to different url based on their device." />
      </FieldSet.Description>
      <Field.Group>
        {fields.map((field, index) => {
          if (field.type !== 'device') {
            return null;
          }

          return (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
            >
              <HookForm.Field name={`rules.${index}.key`} disabled={disabled}>
                <Field.Label>
                  <Trans message="Device" />
                </Field.Label>
                <Select.Root items={selectItems}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {selectItems.map(item => (
                      <Select.Item key={item.value} value={item.value}>
                        {item.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name={`rules.${index}.value`} disabled={disabled}>
                <Field.Label>
                  <Trans message="URL" />
                </Field.Label>
                <Input required type="url" />
                <Field.Error />
              </HookForm.Field>

              <RemoveButton onClick={() => remove(index)} />
            </div>
          );
        })}
        <Button
          size="sm"
          variant="outline"
          className="w-max"
          onClick={() => append({key: 'desktop', value: '', type: 'device'})}
          disabled={disabled}
        >
          <PlusIcon />
          <Trans message="Add device" />
        </Button>
      </Field.Group>
    </FieldSet.Root>
  );
}

function PlatformRulesSection({disabled}: {disabled: boolean}) {
  const selectItems = useMemo(
    () => [
      {value: 'windows', label: <Trans message="Windows" />},
      {value: 'osx', label: <Trans message="MacOs" />},
      {value: 'ios', label: <Trans message="iOS" />},
      {value: 'android', label: <Trans message="Android" />},
      {value: 'linux', label: <Trans message="Linux" />},
    ],
    [],
  );

  const {fields, append, remove} = useFieldArray<FormValue>({
    name: 'rules',
  });

  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <AirplayIcon />
        <Trans message="Platform targeting" />
      </FieldSet.Legend>
      <FieldSet.Description>
        <Trans message="Redirect users to different url based on their platform." />
      </FieldSet.Description>
      <Field.Group>
        {fields.map((field, index) => {
          if (field.type !== 'platform') {
            return null;
          }

          return (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
            >
              <HookForm.Field name={`rules.${index}.key`} disabled={disabled}>
                <Field.Label>
                  <Trans message="Platform" />
                </Field.Label>
                <Select.Root items={selectItems}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {selectItems.map(item => (
                      <Select.Item key={item.value} value={item.value}>
                        {item.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name={`rules.${index}.value`} disabled={disabled}>
                <Field.Label>
                  <Trans message="URL" />
                </Field.Label>
                <Input required type="url" />
                <Field.Error />
              </HookForm.Field>

              <RemoveButton onClick={() => remove(index)} />
            </div>
          );
        })}
        <Button
          size="sm"
          variant="outline"
          className="w-max"
          onClick={() => append({key: 'windows', value: '', type: 'platform'})}
          disabled={disabled}
        >
          <PlusIcon />
          <Trans message="Add platform" />
        </Button>
      </Field.Group>
    </FieldSet.Root>
  );
}

type RemoveButtonProps = {
  onClick: () => void;
};
function RemoveButton({onClick}: RemoveButtonProps) {
  const isMobile = useIsMobileMediaQuery();

  if (isMobile) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={onClick}>
        <Trans message="Remove" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      size="icon"
      className="mt-6.5"
    >
      <XIcon />
    </Button>
  );
}
