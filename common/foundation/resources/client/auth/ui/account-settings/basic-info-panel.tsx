import {UpdateUserBody} from '@app/gen/schemas/update-user-body';
import {User} from '@app/gen/schemas/user';
import {UploadType} from '@app/site-config';
import {updateDetailsOptions} from '@common/auth/ui/account-settings/account-settings-queries';
import {AccountSettingsId} from '@common/auth/ui/account-settings/account-settings-sidenav';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Avatar} from '@ui/avatar/avatar';
import {Trans} from '@ui/i18n/trans';
import {AtSignIcon} from 'lucide-react';
import {useId, useState} from 'react';
import {useForm} from 'react-hook-form';
import {AccountSettingsPanel} from './account-settings-panel';

interface Props {
  user: User;
}
export function BasicInfoPanel({user}: Props) {
  const formId = useId();
  const form = useForm<UpdateUserBody>({
    defaultValues: {
      name: user.name || '',
      image: user.image,
    },
  });
  const updateDetails = useMutation(updateDetailsOptions(user.id));

  const handleUpdateDetails = (value: UpdateUserBody) => {
    updateDetails.mutate(value, {
      onSuccess: () => {
        form.reset({
          ...form.getValues(),
          ...value,
        });
        toast.success(<Trans message="Updated account details" />);
      },
      onError: r => onFormQueryError(r, form),
    });
  };

  return (
    <AccountSettingsPanel
      id={AccountSettingsId.AccountDetails}
      title={<Trans message="Update name and profile image" />}
      actions={
        <Button
          type="submit"
          variant="default"
          color="primary"
          size="sm"
          form={formId}
          disabled={
            updateDetails.isPending ||
            !form.formState.isValid ||
            !form.formState.isDirty
          }
        >
          <Trans message="Save changes" />
        </Button>
      }
    >
      <HookForm.Root
        form={form}
        className="flex flex-col items-center gap-10 md:flex-row md:gap-15"
        onSubmit={handleUpdateDetails}
        id={formId}
      >
        <FileUploadProvider>
          <AvatarSelector user={user} />
        </FileUploadProvider>
        <div className="w-full flex-auto">
          <div className="mb-4 flex items-center gap-1 text-muted-foreground">
            <AtSignIcon className="size-5" />
            {user.email}
          </div>
          <HookForm.Field name="name">
            <Field.Label>
              <Trans message="Name" />
            </Field.Label>
            <Input />
            <Field.Error />
          </HookForm.Field>
        </div>
      </HookForm.Root>
    </AccountSettingsPanel>
  );
}

interface AvatarManagerProps {
  user: {
    id: User['id'];
    image?: User['image'];
    name: User['name'];
  };
}
function AvatarSelector({user}: AvatarManagerProps) {
  const [value, setValue] = useState(user.image);
  const updateAvatar = useMutation(updateDetailsOptions(user.id));
  return (
    <FileUploadProvider>
      <ImageSelector.Avatar
        value={value ?? null}
        uploadType={UploadType.avatars}
        className="size-22.5"
        placeholderIcon={
          <Avatar label={user.name} size="size-full text-2xl" circle />
        }
        onChange={(_, entry) => {
          setValue(entry?.url);
          updateAvatar.mutate({
            image: entry?.url ?? null,
            image_entry_id: entry?.id ?? null,
          });
        }}
      />
    </FileUploadProvider>
  );
}
