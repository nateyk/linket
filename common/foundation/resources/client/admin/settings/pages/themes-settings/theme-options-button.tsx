import {AdminSettings} from '@common/admin/settings/admin-settings';
import {useSettingsPageStore} from '@common/admin/settings/layout/settings-page-store';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {CssTheme} from '@ui/themes/css-theme';
import {toast} from '@ui/toast/toast';
import {
  MoreVerticalIcon,
  RefreshCcwIcon,
  SlidersHorizontalIcon,
  TrashIcon,
} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useForm, useFormContext} from 'react-hook-form';

interface Props {
  selectedThemeId: number;
  onSelectedThemeChange: (index: number) => void;
}
export function ThemeOptionsButton({
  selectedThemeId,
  onSelectedThemeChange,
}: Props) {
  const preview = useSettingsPageStore(s => s.preview);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const {setValue, getValues} = useFormContext<AdminSettings>();
  const {
    data: {defaults},
  } = useAdminSettings();

  const deleteTheme = () => {
    if (getValues('themes').length <= 1) {
      toast.danger(message('At least one theme is required'));
      return;
    }
    if (selectedThemeId) {
      setValue(
        'themes',
        getValues('themes').filter(t => t.id !== selectedThemeId),
        {shouldDirty: true},
      );
      onSelectedThemeChange(getValues('themes')[0]!.id);
    }
  };

  const resetThemeColors = () => {
    const selectedThemeIndex = getValues('themes').findIndex(
      t => t.id === selectedThemeId,
    );
    const path = `themes.${selectedThemeIndex}` as 'themes.0';
    const defaultColors = getValues(`${path}.is_dark`)
      ? defaults.themes.dark
      : defaults.themes.light;

    Object.entries(defaultColors).forEach(([colorName, themeValue]) => {
      preview.setThemeValue(colorName, themeValue);
    });
    preview.setThemeFont(null);

    setValue(`${path}.values`, defaultColors, {
      shouldDirty: true,
    });
    setValue(`${path}.font`, undefined, {
      shouldDirty: true,
    });
  };

  const selectedTheme = getValues('themes').find(t => t.id === selectedThemeId);

  return (
    <>
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button variant="outline" size="icon" />}>
          <MoreVerticalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Item onClick={() => setSettingsDialogOpen(true)}>
            <SlidersHorizontalIcon />
            <Trans message="Settings" />
          </Dropdown.Item>
          <Dropdown.Item onClick={() => resetThemeColors()}>
            <RefreshCcwIcon />
            <Trans message="Reset to default" />
          </Dropdown.Item>
          <Dropdown.Item
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <TrashIcon />
            <Trans message="Delete" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>

      <AlertDialog.Root
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Title>
                <Trans message="Delete theme" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="Are you sure you want to delete this theme?" />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                color="danger"
                onClick={() => {
                  deleteTheme();
                  setDeleteDialogOpen(false);
                }}
              >
                <Trans message="Delete" />
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <SettingsDialog
        theme={selectedTheme}
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </>
  );
}

interface SettingsDialogProps {
  theme?: CssTheme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
function SettingsDialog({theme, open, onOpenChange}: SettingsDialogProps) {
  const settingsForm = useFormContext<AdminSettings>();
  const form = useForm<CssTheme>({defaultValues: theme});
  const formId = 'theme-settings-form';

  useEffect(() => {
    if (theme) {
      form.reset(theme);
    }
  }, [theme, form]);

  useEffect(() => {
    const subscription = form.watch((value, {name}) => {
      // theme can only be set as either light or dark default
      if (name === 'default_light' && value.default_light) {
        form.setValue('default_dark', false);
      }
      if (name === 'default_dark' && value.default_dark) {
        form.setValue('default_light', false);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const applyChanges = (value: CssTheme) => {
    settingsForm.getValues('themes').forEach((currentTheme, index) => {
      // update changed theme
      if (currentTheme.id === value.id) {
        settingsForm.setValue(`themes.${index}`, value, {
          shouldDirty: true,
        });
        return;
      }

      // unset "default_light" and "default_dark" on other themes
      if (value.default_light) {
        settingsForm.setValue(
          `themes.${index}`,
          {...currentTheme, default_light: false},
          {shouldDirty: true},
        );
        return;
      }
      if (value.default_dark) {
        settingsForm.setValue(
          `themes.${index}`,
          {...currentTheme, default_dark: false},
          {shouldDirty: true},
        );
        return;
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <HookForm.Root
          form={form}
          id={formId}
          onSubmit={values => {
            applyChanges(values);
            onOpenChange(false);
          }}
        >
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                <Trans message="Update settings" />
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
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ThemeSettingsFormFields() {
  return (
    <Field.Group>
      <HookForm.Field name="name">
        <Field.Label>
          <Trans message="Name" />
        </Field.Label>
        <Input autoFocus required />
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name="is_dark">
        <Field.Label>
          <Switch />
          <Trans message="Dark theme" />
        </Field.Label>
        <Field.Description>
          <Trans message="Whether this theme has light text on dark background." />
        </Field.Description>
        <Field.Error />
      </HookForm.Field>

      <Field.Separator />

      <HookForm.Field name="default_light">
        <Field.Label>
          <Switch />
          <Trans message="Default for light mode" />
        </Field.Label>
        <Field.Description>
          <Trans message="When light mode is selected, this theme will be used." />
        </Field.Description>
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name="default_dark">
        <Field.Label>
          <Switch />
          <Trans message="Default for dark mode" />
        </Field.Label>
        <Field.Description>
          <Trans message="When dark mode is selected, this theme will be used." />
        </Field.Description>
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}
