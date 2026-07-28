import {User} from '@app/gen/schemas/user';
import {UploadType} from '@app/site-config';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {apiClient} from '@common/http/query-client';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {useMutation} from '@tanstack/react-query';
import {Avatar} from '@ui/avatar/avatar';
import {Chip} from '@ui/forms/input-field/chip-field/chip';
import {Trans} from '@ui/i18n/trans';
import {ErrorOutlineIcon} from '@ui/icons/material/ErrorOutline';
import {ReactElement, useState} from 'react';

interface Props {
  user: User;
  badge?: ReactElement;
}
export function UpdateUserPageHeader({user, badge}: Props) {
  const isSuspended = !!user.banned_at;
  return (
    <div className="mx-auto mt-9.5 mb-11 w-full max-w-6xl shrink-0 px-6">
      <div className="flex gap-8">
        <div className="relative">
          <AvatarSelector user={user} />
          <div className="absolute top-0.5 right-0">{badge}</div>
        </div>
        <div>
          {!!user.roles?.length && (
            <Chip radius="rounded-card" size="sm" className="mb-1.5 w-max">
              {user.roles[0]?.name}
            </Chip>
          )}
          <h1 className="text-2xl font-semibold">{user.name}</h1>
          <div className="mt-1 text-sm text-muted-foreground">{user.email}</div>
        </div>
      </div>
      {isSuspended && (
        <div className="mt-6 flex w-max items-center gap-2 rounded-card bg-destructive/10 px-2.5 py-1.5 text-sm text-destructive">
          <ErrorOutlineIcon size="sm" />
          {user.ban_reason ? (
            <Trans
              message="Suspended: :reason"
              values={{reason: user.ban_reason}}
            />
          ) : (
            <Trans message="Suspended" />
          )}
        </div>
      )}
    </div>
  );
}

interface AvatarManagerProps {
  user: User;
}

function AvatarSelector({user}: AvatarManagerProps) {
  const [value, setValue] = useState(user.image);
  const updateAvatar = useUpdateAvatar(user.id);
  return (
    <FileUploadProvider>
      <ImageSelector.Avatar
        value={value}
        uploadType={UploadType.avatars}
        className="size-22.5"
        placeholderIcon={
          <Avatar label={user.name} size="size-full text-2xl" circle />
        }
        onChange={(_, entry) => {
          setValue(entry?.url ?? '');
          updateAvatar.mutate({
            image: entry?.url ?? null,
            image_entry_id: entry?.id ?? null,
          });
        }}
      />
    </FileUploadProvider>
  );
}

function useUpdateAvatar(userId: number) {
  return useMutation({
    mutationFn: (payload: {
      image?: string | null;
      image_entry_id?: number | null;
    }) => apiClient.put(`users/${userId}`, payload).then(r => r.data),
    onError: r => showHttpErrorToast(r),
  });
}
