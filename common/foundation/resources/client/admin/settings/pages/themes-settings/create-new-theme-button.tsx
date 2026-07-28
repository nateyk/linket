import {AdminSettings} from '@common/admin/settings/admin-settings';
import {ThemeSettingsFormFields} from '@common/admin/settings/pages/themes-settings/theme-options-button';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Trans} from '@ui/i18n/trans';
import {CssTheme} from '@ui/themes/css-theme';
import {randomNumber} from '@ui/utils/string/random-number';
import {PlusIcon} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useForm, useFormContext} from 'react-hook-form';

interface Props {
  type?: string;
  onCreated?: (index: number) => void;
}
export function CreateNewThemeButton({type = 'site', onCreated}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={<Button variant="outline" size="icon" className="ms-auto" />}
      >
        <PlusIcon />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <NewThemeDialog
          type={type}
          onCreated={newThemeId => {
            onCreated?.(newThemeId);
            setOpen(false);
          }}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface NewThemeDialogProps {
  type: string;
  onCreated?: (index: number) => void;
}
function NewThemeDialog({type, onCreated}: NewThemeDialogProps) {
  const {
    data: {defaults},
  } = useAdminSettings();
  const settingsForm = useFormContext<AdminSettings>();
  const form = useForm<CssTheme>({
    defaultValues: {
      default_dark: false,
      default_light: false,
      is_dark: false,
    },
  });
  const formId = 'new-theme-form';

  useEffect(() => {
    const subscription = form.watch((value, {name}) => {
      if (name === 'default_light' && value.default_light) {
        form.setValue('default_dark', false);
      }
      if (name === 'default_dark' && value.default_dark) {
        form.setValue('default_light', false);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const createTheme = (formValues: CssTheme) => {
    const themeColors = formValues.is_dark
      ? defaults.themes.dark
      : defaults.themes.light;
    const currentThemes = settingsForm.getValues('themes');
    const newThemeId = randomNumber(100, 1000);

    settingsForm.setValue(
      'themes',
      [
        ...currentThemes,
        {
          ...formValues,
          id: newThemeId,
          type,
          values: themeColors,
        },
      ],
      {shouldDirty: true},
    );

    onCreated?.(newThemeId);
  };

  return (
    <HookForm.Root
      form={form}
      id={formId}
      onSubmit={values => createTheme(values)}
    >
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="New theme" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <ThemeSettingsFormFields />
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button
            color="primary"
            type="submit"
            disabled={!form.formState.isDirty}
          >
            <Trans message="Save" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}
