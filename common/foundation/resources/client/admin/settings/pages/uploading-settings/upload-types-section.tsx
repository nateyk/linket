import {AdminSettings} from '@common/admin/settings/admin-settings';
import {SettingsSectionHeader} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {
  UploadingBackendSettings,
  UploadingTypeSettings,
} from '@common/core/settings/base-backend-settings';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@shadcn/forms/number-field/number-field';
import {Item} from '@shadcn/item/item';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {SettingsIcon} from 'lucide-react';
import {ReactNode, useState} from 'react';
import {useForm, useFormContext, useWatch} from 'react-hook-form';

export function UploadTypesSection() {
  const {data} = useAdminSettings();
  const form = useFormContext<AdminSettings>();

  return (
    <section>
      <SettingsSectionHeader size="lg" className="mb-4">
        <Trans message="Upload types" />
        <Trans message="Configure storage backends and file restrictions for different upload types across the site." />
      </SettingsSectionHeader>
      <div className="flex flex-col gap-3">
        {Object.entries(data.uploading.types).map(([type, config]) => (
          <UploadTypeDialog
            key={type}
            name={type}
            label={config.label}
            description={config.description}
            onUpdated={value => {
              form.setValue(`client.uploading.types.${type}`, value, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
          />
        ))}
      </div>
    </section>
  );
}

type UploadTypeDialogProps = {
  name: string;
  label: string;
  description: string;
  onUpdated: (value: UploadingTypeSettings) => void;
};

function UploadTypeDialog({
  name,
  label,
  description,
  onUpdated,
}: UploadTypeDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        nativeButton={false}
        className="transition-colors hover:bg-hover"
        render={<Item.Root variant="outline" />}
      >
        <Item.Content>
          <Item.Title>
            <Trans message={label} />
          </Item.Title>
          <Item.Description>
            <Trans message={description} />
          </Item.Description>
        </Item.Content>
        <Item.Actions>
          <SettingsIcon className="size-4" />
        </Item.Actions>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop />
        <UploadTypesDialogContent
          name={name}
          onUpdated={onUpdated}
          setOpen={setOpen}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function UploadTypesDialogContent({
  name,
  onUpdated,
  setOpen,
}: Pick<UploadTypeDialogProps, 'name' | 'onUpdated'> & {
  setOpen: (open: boolean) => void;
}) {
  const {getValues} = useFormContext<AdminSettings>();
  const [defaultValues] = useState(() =>
    getValues(`client.uploading.types.${name}`),
  );

  const form = useForm<UploadingTypeSettings>({
    defaultValues,
  });

  const availableBackends =
    useWatch<AdminSettings, 'client.uploading.backends'>({
      name: 'client.uploading.backends',
    }) ?? [];

  return (
    <HookForm.Root
      form={form}
      className="contents"
      onSubmit={value => {
        onUpdated(value);
        setOpen(false);
      }}
    >
      <Dialog.Content className="sm:max-w-lg">
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Update upload type" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <BackendsField availableBackends={availableBackends} />
            <HookForm.Field name="root">
              <Field.Label>
                <Trans message="Folder" />
              </Field.Label>
              <Input />
              <Field.Description>
                <Trans message="Where in the backend should the uploads be stored. Leave empty to use default folder." />
              </Field.Description>
              <Field.Error />
            </HookForm.Field>
            <MaxUploadSizeField />
            <AllowedFileTypesField />
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button color="primary" type="submit">
            <Trans message="Update" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

function BackendsField({
  availableBackends,
}: {
  availableBackends: UploadingBackendSettings[];
}) {
  return (
    <HookForm.Field name="backends">
      <Field.Label>
        <Trans message="Storage backends" />
      </Field.Label>
      <BackendsCombobox availableBackends={availableBackends} />
      <Field.Description>
        <Trans message="Select in which backend(s) these uploads should be stored." />
      </Field.Description>
      <Field.Error />
    </HookForm.Field>
  );
}

function BackendsCombobox({
  availableBackends,
}: {
  availableBackends: UploadingBackendSettings[];
}) {
  const {trans} = useTrans();
  return (
    <Combobox.Root items={availableBackends} multiple>
      <Combobox.Chips>
        <Combobox.Value>
          {(value: string[]) => (
            <>
              {value.map(backendId => (
                <Combobox.Chip key={backendId}>
                  {availableBackends.find(b => b.id === backendId)?.name}
                </Combobox.Chip>
              ))}
              <Combobox.ChipsInput
                placeholder={trans(message('Select backends'))}
              />
            </>
          )}
        </Combobox.Value>
      </Combobox.Chips>
      <Combobox.Content>
        <Combobox.Empty>
          <Trans message="No matching backends." />
        </Combobox.Empty>
        <Combobox.List>
          {(backend: UploadingBackendSettings) => (
            <Combobox.Item key={backend.id} value={backend.id}>
              {backend.name}
            </Combobox.Item>
          )}
        </Combobox.List>
      </Combobox.Content>
    </Combobox.Root>
  );
}

const MaxFileSize = 108851651149824;
function MaxUploadSizeField() {
  return (
    <HookForm.Field name="max_file_size">
      <Field.Label>
        <Trans message="Maximum file size" />
      </Field.Label>
      <NumberField min={1} max={MaxFileSize}>
        <NumberFieldDecrement />
        <div className="flex flex-auto items-center">
          <NumberFieldInput />
          <div className="pr-3 text-xs text-muted-foreground">
            <Trans message="Bytes" />
          </div>
        </div>
        <NumberFieldIncrement />
      </NumberField>
      <Field.Description>
        <Trans message="Size (in bytes) for a single file user can upload." />
      </Field.Description>
      <Field.Error />
    </HookForm.Field>
  );
}

export function AllowedFileTypesField() {
  return (
    <HookForm.Field name="accept">
      <Field.Label>
        <Trans message="Allowed file types" />
      </Field.Label>
      <AllowedFileTypesCombobox />
      <Field.Description>
        <Trans message="Extension, mime type or file type. Leave empty to use defaults." />
      </Field.Description>
      <Field.Error />
    </HookForm.Field>
  );
}

const fileTypeLabels: Record<string, ReactNode> = {
  image: <Trans message="Image" />,
  video: <Trans message="Video" />,
  audio: <Trans message="Audio" />,
  '.png': <Trans message="PNG" />,
  '.jpeg': <Trans message="JPG" />,
  '.gif': <Trans message="GIF" />,
  '.mp3': <Trans message="MP3" />,
  '.mp4': <Trans message="MP4" />,
};

function AllowedFileTypesCombobox() {
  const {trans} = useTrans();
  return (
    <Combobox.Root items={Object.keys(fileTypeLabels)} multiple>
      <Combobox.Chips>
        <Combobox.Value>
          {(value: string[]) => (
            <>
              {value.map(item => (
                <Combobox.Chip key={item}>
                  {fileTypeLabels[item] ?? item}
                </Combobox.Chip>
              ))}
              <Combobox.ChipsInput
                placeholder={trans(message('Select or enter a type...'))}
              />
            </>
          )}
        </Combobox.Value>
      </Combobox.Chips>
      <Combobox.Content>
        <Combobox.List>
          {(item: string) => (
            <Combobox.Item key={item} value={item}>
              {fileTypeLabels[item] ?? item}
            </Combobox.Item>
          )}
        </Combobox.List>
      </Combobox.Content>
    </Combobox.Root>
  );
}
