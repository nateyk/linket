import {Localization} from '@app/gen/schemas/localization';
import {UpdateLocalizationBody} from '@app/gen/schemas/update-localization-body';
import {updateLocalizationOptions} from '@common/admin/translations/localizations-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {getLanguageList} from '@ui/utils/intl/languages';
import {useMemo} from 'react';
import {useForm} from 'react-hook-form';

type UpdateLocalizationDialogProps = {
  localization: Localization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UpdateLocalizationDialog({
  localization,
  open,
  onOpenChange,
}: UpdateLocalizationDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent
          localization={localization}
          onClose={() => onOpenChange(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  localization,
  onClose,
}: {
  localization: Localization;
  onClose: () => void;
}) {
  const form = useForm<UpdateLocalizationBody>({
    defaultValues: {
      name: localization.name,
      language: localization.language,
      direction: localization.direction,
    },
  });

  const languageItems = useMemo(
    () =>
      getLanguageList().map(language => ({
        value: language.code,
        label: language.name,
      })),
    [],
  );

  const directionItems = useMemo(
    () => [
      {
        value: 'ltr' as const,
        label: <Trans message="Left to right (default)" />,
      },
      {
        value: 'rtl' as const,
        label: <Trans message="Right to left" />,
      },
    ],
    [],
  );

  const updateLocalization = useMutation(
    updateLocalizationOptions(localization.id),
  );

  const handleSubmit = (values: UpdateLocalizationBody) => {
    updateLocalization.mutate(values, {
      onSuccess: () => {
        toast.success(<Trans message="Localization updated" />);
        onClose();
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Update localization" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="name">
              <Field.Label>
                <Trans message="Name" />
              </Field.Label>
              <Input autoFocus required />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="language">
              <Field.Label>
                <Trans message="Language" />
              </Field.Label>
              <Select.Root items={languageItems}>
                <Select.Trigger className="w-full">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {languageItems.map(item => (
                    <Select.Item key={item.value} value={item.value}>
                      {item.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="direction">
              <Field.Label>
                <Trans message="Direction" />
              </Field.Label>
              <Select.Root items={directionItems}>
                <Select.Trigger className="w-full">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {directionItems.map(item => (
                    <Select.Item key={item.value} value={item.value}>
                      {item.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Field.Error />
            </HookForm.Field>
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={updateLocalization.isPending}>
            <Trans message="Update" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}
